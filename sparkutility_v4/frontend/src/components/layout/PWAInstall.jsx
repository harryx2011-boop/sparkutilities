import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Smartphone, Share, Plus, CheckCircle2, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBranding } from '@/context/BrandingContext';

// True if the page is already running as an installed PWA.
function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)')?.matches
    || window.navigator?.standalone === true;
}

function isIOSSafari() {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent || '';
  const isIDevice = /iPhone|iPad|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIDevice && isSafari;
}

export default function PWAInstall() {
  const { branding } = useBranding();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(() => isStandalone());
  const [showIOSCard, setShowIOSCard] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (isStandalone()) { setInstalled(true); return undefined; }

    const onBeforeInstall = (e) => {
      // Stash the event so we can fire prompt() on a user gesture later.
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const ios = isIOSSafari();

  // Nothing to show: already running standalone, or this browser doesn't
  // support installation AND isn't iOS Safari.
  if (installed) return null;
  if (!deferredPrompt && !ios) return null;

  const siteName = branding.siteName || 'SparkUtilities';

  const handleInstall = async () => {
    if (ios) {
      setShowIOSCard(v => !v);
      return;
    }
    if (!deferredPrompt) return;
    setPending(true);
    try {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice?.outcome === 'accepted') setInstalled(true);
    } catch {
    } finally {
      setDeferredPrompt(null);
      setPending(false);
    }
  };

  return (
    <section className="border-t border-border/50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.4 }}
          className="glass-card rounded-2xl p-6 sm:p-8"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              {ios ? <Smartphone className="w-7 h-7 text-primary" /> : <Download className="w-7 h-7 text-primary" />}
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight">
                Install <span className="gradient-text">{siteName}</span> as a mobile app
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                Launch from your dock or home screen, work fully offline, and skip the browser tab.
                Conversion still happens locally — nothing changes about your privacy.
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5 text-primary" />
                  Works offline
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                  Native window
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                  No app store
                </span>
              </div>
            </div>

            <Button
              onClick={handleInstall}
              disabled={pending}
              size="lg"
              className="gap-2 w-full sm:w-auto"
            >
              {pending ? (
                <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : ios ? (
                <Smartphone className="w-4 h-4" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {ios ? 'Show install steps' : 'Install app'}
            </Button>
          </div>

          {/* iOS Safari step-by-step */}
          <AnimatePresence>
            {ios && showIOSCard && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-5 pt-5 border-t border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <Step
                    n={1}
                    title="Open the share sheet"
                    body="Tap the share icon at the bottom of Safari."
                    icon={<Share className="w-4 h-4" />}
                  />
                  <Step
                    n={2}
                    title="Choose Add to Home Screen"
                    body="Scroll the share menu and pick this option."
                    icon={<Plus className="w-4 h-4" />}
                  />
                  <Step
                    n={3}
                    title={`Tap Add`}
                    body={`${siteName} will install as an icon on your home screen.`}
                    icon={<CheckCircle2 className="w-4 h-4" />}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}

function Step({ n, title, body, icon }) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/40 p-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-5 h-5 rounded-md bg-primary/15 text-primary text-[11px] font-semibold flex items-center justify-center">
          {n}
        </span>
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
          {icon}
          Step {n}
        </span>
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{body}</p>
    </div>
  );
}
