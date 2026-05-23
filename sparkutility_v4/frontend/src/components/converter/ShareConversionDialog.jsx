import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Copy, Check, Sparkles, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBranding } from '@/context/BrandingContext';
import { formatFileSize } from '@/lib/conversionFormats';

async function renderToBlob(node) {
  const { default: html2canvas } = await import('html2canvas');
  const canvas = await html2canvas(node, {
    backgroundColor: null,
    scale: 2,
    useCORS: true,
    logging: false,
  });
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

export default function ShareConversionDialog({ open, onClose, file, sourceFormat, targetFormat, originalSize, outputSize }) {
  const { branding } = useBranding();
  const cardRef = useRef(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) {
      setMessage('');
      setCopied(false);
    }
  }, [open]);

  const sizeReduction = originalSize > 0 && outputSize > 0
    ? ((originalSize - outputSize) / originalSize) * 100
    : 0;

  const onDownload = async () => {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      const blob = await renderToBlob(cardRef.current);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sparkutility-${sourceFormat || 'file'}-to-${targetFormat || 'output'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } finally {
      setBusy(false);
    }
  };

  const onCopy = async () => {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      const blob = await renderToBlob(cardRef.current);
      if (!blob) return;
      if (navigator.clipboard && window.ClipboardItem) {
        // eslint-disable-next-line no-undef
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } else {
        await onDownload();
      }
    } catch {
      await onDownload();
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const siteName = branding.siteName || 'SparkUtilities';
  const safeMessage = (message || '').slice(0, 140);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-2xl bg-popover border border-border/60 shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between p-4 border-b border-border/50">
            <h3 className="font-display font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Share your conversion
            </h3>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} aria-label="Close">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="p-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="share-msg">Custom message (optional)</Label>
              <Input
                id="share-msg"
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 140))}
                placeholder={`I converted ${sourceFormat} → ${targetFormat} seamlessly!`}
                maxLength={140}
              />
              <p className="text-[10px] text-muted-foreground text-right">{message.length}/140</p>
            </div>

            {/* Card preview — also the html2canvas target */}
            <div className="rounded-xl overflow-hidden border border-border/40">
              <div
                ref={cardRef}
                className="p-6 text-center"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--card)) 100%)',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold mb-4"
                  style={{
                    background: 'hsl(var(--primary) / 0.15)',
                    color: 'hsl(var(--primary))',
                  }}
                >
                  <ImageIcon className="w-3 h-3" />
                  {siteName}
                </div>

                <p className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
                  <span style={{
                    background: 'linear-gradient(135deg, hsl(var(--gradient-start)) 0%, hsl(var(--gradient-end)) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}>
                    {sourceFormat || '???'}
                  </span>
                  <span className="text-muted-foreground mx-2">→</span>
                  <span style={{
                    background: 'linear-gradient(135deg, hsl(var(--gradient-start)) 0%, hsl(var(--gradient-end)) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}>
                    {targetFormat || '???'}
                  </span>
                </p>

                <p className="mt-3 text-sm" style={{ color: 'hsl(var(--foreground))' }}>
                  {safeMessage || `Converted seamlessly with ${siteName}`}
                </p>

                <div className="mt-4 grid grid-cols-3 gap-2 text-[10px]">
                  <Stat label="Input" value={formatFileSize(originalSize || (file?.size ?? 0))} />
                  <Stat label="Output" value={outputSize ? formatFileSize(outputSize) : '—'} />
                  <Stat label="Saved" value={sizeReduction > 0 ? `-${sizeReduction.toFixed(0)}%` : '—'} />
                </div>

                <p className="mt-4 text-[10px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  100% local · No uploads
                </p>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" disabled={busy} onClick={onCopy} className="gap-1.5">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy image'}
              </Button>
              <Button size="sm" disabled={busy} onClick={onDownload} className="gap-1.5">
                <Download className="w-4 h-4" />
                Download PNG
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Stat({ label, value }) {
  return (
    <div
      className="rounded-md p-2"
      style={{
        background: 'hsl(var(--secondary) / 0.5)',
      }}
    >
      <p className="uppercase tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>{label}</p>
      <p className="font-mono font-semibold mt-0.5" style={{ color: 'hsl(var(--foreground))', fontSize: 11 }}>
        {value}
      </p>
    </div>
  );
}
