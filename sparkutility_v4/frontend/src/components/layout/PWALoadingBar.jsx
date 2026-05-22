import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * PWALoadingBar
 * A slim top-of-page progress bar that appears when the PWA service worker
 * is installing assets on first load. Uses the 'sw-progress' custom DOM event
 * fired by registerSW.js.
 *
 * Renders nothing outside of a PWA install event — zero visual impact on
 * normal navigation.
 */
export default function PWALoadingBar() {
  const [pct, setPct]         = useState(0);
  const [visible, setVisible] = useState(false);
  const [done, setDone]       = useState(false);

  useEffect(() => {
    const onProgress = (e) => {
      const { pct: p, done: d } = e.detail;
      setVisible(true);
      setPct(p);
      if (d) {
        setDone(true);
        // Auto-hide after a short grace period
        setTimeout(() => setVisible(false), 800);
      }
    };

    window.addEventListener('sw-progress', onProgress);
    return () => window.removeEventListener('sw-progress', onProgress);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-background/50"
          aria-label="App loading"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <motion.div
            className="h-full bg-primary rounded-r-full"
            initial={{ width: '0%' }}
            animate={{ width: `${pct}%` }}
            transition={{ ease: 'easeOut', duration: done ? 0.3 : 0.5 }}
          />
          {/* Shimmer overlay */}
          {!done && (
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${pct}%` }}
            >
              <div
                className="absolute inset-0 -skew-x-12 animate-pulse"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
                }}
              />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
