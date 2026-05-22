import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, X } from 'lucide-react';
import { SAB_AVAILABLE } from './ConversionCard';

/**
 * Shown only when SharedArrayBuffer / cross-origin isolation is unavailable.
 * In that mode the converter automatically falls back to the single-threaded
 * @ffmpeg/core build — every file still converts, but video encoding runs
 * 3–5× slower because we can't spawn one Web Worker per CPU thread.
 *
 * Most common causes: production host hasn't set COOP/COEP, the page was
 * opened inside an in-app WebView (iOS WeChat / TikTok), or the user's
 * browser is older than the SAB-default-on era.
 */
export default function IsolationNotice() {
  const [dismissed, setDismissed] = useState(false);
  if (SAB_AVAILABLE || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2 }}
        className="flex items-start gap-3 rounded-xl border bg-yellow-500/10 border-yellow-500/40 text-yellow-700 dark:text-yellow-300 px-4 py-3 mb-4"
      >
        <Cpu className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold">
            Single-threaded mode — conversions will be slower
          </p>
          <p className="text-[11px] mt-0.5 opacity-90 leading-relaxed">
            This browser session does not have cross-origin isolation, so the multi-threaded FFmpeg
            engine cannot start. Every file still converts, but video encoding runs roughly 3–5×
            slower because we can&rsquo;t spawn a worker per CPU thread. To re-enable multi-threading,
            reload the page in a regular browser tab (not an in-app webview) or have the host set
            <span className="font-mono mx-1 px-1 py-0.5 rounded bg-yellow-500/20">Cross-Origin-Opener-Policy: same-origin</span>
            and
            <span className="font-mono mx-1 px-1 py-0.5 rounded bg-yellow-500/20">Cross-Origin-Embedder-Policy: require-corp</span>
            on the navigation response.
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-current opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Dismiss isolation notice"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
