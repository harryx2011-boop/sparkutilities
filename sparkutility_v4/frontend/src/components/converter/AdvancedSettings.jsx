import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const CODEC_OPTIONS = {
  video:    ['H.264 (libx264)', 'H.265 (libx265)', 'VP9', 'AV1', 'MPEG-4', 'ProRes'],
  audio:    ['AAC', 'MP3 (libmp3lame)', 'FLAC', 'Opus', 'Vorbis', 'PCM'],
  image:    ['Auto', 'Lossy', 'Lossless', 'Progressive'],
  document: ['Auto'],
};

const BITRATE_OPTIONS = {
  video:    ['Auto', '500k', '1M', '2M', '4M', '8M', '16M', '32M'],
  audio:    ['Auto', '64k', '96k', '128k', '192k', '256k', '320k'],
  image:    ['Auto'],
  document: ['Auto'],
};

const RESOLUTION_OPTIONS  = ['Auto', '3840x2160 (4K)', '1920x1080 (1080p)', '1280x720 (720p)', '854x480 (480p)', '640x360 (360p)'];
const FPS_OPTIONS         = ['Auto', '60', '30', '24', '15'];
const SAMPLE_RATE_OPTIONS = ['Auto', '48000 Hz', '44100 Hz', '22050 Hz', '16000 Hz'];
const CHANNELS_OPTIONS    = ['Auto', 'Stereo (2)', 'Mono (1)', 'Surround (5.1)'];

export default function AdvancedSettings({ category, settings, onChange }) {
  const [open, setOpen] = useState(false);
  const set = (key, val) => onChange({ ...settings, [key]: val });

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Settings className="w-3.5 h-3.5" />
        Advanced Settings
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
            <div className="mt-3 p-3 rounded-xl bg-background/60 border border-border/50 grid grid-cols-2 gap-3">
              {/* Codec */}
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Codec</Label>
                <Select value={settings.codec || 'Auto'} onValueChange={v => set('codec', v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(CODEC_OPTIONS[category] || CODEC_OPTIONS.video).map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Bitrate */}
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Bitrate</Label>
                <Select value={settings.bitrate || 'Auto'} onValueChange={v => set('bitrate', v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(BITRATE_OPTIONS[category] || BITRATE_OPTIONS.video).map(b => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Video-specific */}
              {category === 'video' && (
                <>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Resolution</Label>
                    <Select value={settings.resolution || 'Auto'} onValueChange={v => set('resolution', v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {RESOLUTION_OPTIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Frame Rate</Label>
                    <Select value={settings.fps || 'Auto'} onValueChange={v => set('fps', v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FPS_OPTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Audio-specific */}
              {category === 'audio' && (
                <>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Sample Rate</Label>
                    <Select value={settings.sampleRate || 'Auto'} onValueChange={v => set('sampleRate', v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SAMPLE_RATE_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Channels</Label>
                    <Select value={settings.channels || 'Auto'} onValueChange={v => set('channels', v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CHANNELS_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Custom flags */}
              <div className="col-span-2 space-y-1">
                <Label className="text-[11px] text-muted-foreground">Custom FFmpeg Flags</Label>
                <Input
                  className="h-8 text-xs font-mono"
                  placeholder="-vf scale=1280:720 -crf 23"
                  value={settings.customFlags || ''}
                  onChange={e => set('customFlags', e.target.value)}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
