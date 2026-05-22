import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { subscribeMemoryPressure } from '@/lib/memoryMonitor';

/**
 * Displays a dismissible banner when JS heap usage exceeds safe thresholds.
 * Uses the same glass-card / UI vocabulary as the rest of the app.
 */
export default function MemoryWarning() {
  const [pressure, setPressure] = useState('ok');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const unsub = subscribeMemoryPressure((level) => {
      setPressure(level);
      // Re-surface the banner if we go from warn→critical
      if (level === 'critical') setDismissed(false);
    });
    return unsub;
  }, []);

  // Reset dismissed state when pressure drops back to ok
  useEffect(() => {
    if (pressure === 'ok') setDismissed(false);
  }, [pressure]);

  const show = (pressure === 'warn' || pressure === 'critical') && !dismissed;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden"
        >
          <div
            className={`flex items-start gap-3 rounded-xl border px-4 py-3 mb-4 ${
              pressure === 'critical'
                ? 'bg-destructive/10 border-destructive/40 text-destructive'
                : 'bg-yellow-500/10 border-yellow-500/40 text-yellow-600 dark:text-yellow-400'
            }`}
          >
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold">
                {pressure === 'critical' ? 'Memory critical' : 'Memory running low'}
              </p>
              <p className="text-[11px] mt-0.5 opacity-80">
                {pressure === 'critical'
                  ? 'Browser memory is nearly full. Close other tabs or finish current conversions before adding more files.'
                  : 'Memory usage is high. Large conversions may fail. Consider closing other tabs.'}
              </p>
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="text-current opacity-60 hover:opacity-100 transition-opacity"
              aria-label="Dismiss memory warning"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
