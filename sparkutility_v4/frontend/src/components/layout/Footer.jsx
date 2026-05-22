import React, { useEffect, useState } from 'react';
import { Heart, Download } from 'lucide-react';

/**
 * Detect whether the current browser supports PWA installation.
 *
 * Browsers that DO support it (either via beforeinstallprompt or the iOS
 * share-sheet Add to Home Screen flow):
 *   - Chrome / Edge (desktop + Android) — fires beforeinstallprompt
 *   - Samsung Internet — fires beforeinstallprompt
 *   - iOS Safari — no event, but manual A2HS works
 *
 * Browsers that do NOT support PWA installation:
 *   - Firefox (desktop + Android) — no beforeinstallprompt, no A2HS
 *   - Firefox Focus
 *   - Opera Mini
 *   - IE / Legacy Edge (EdgeHTML)
 *   - Any in-app WebView (e.g. Instagram, Facebook browsers)
 */
function detectPWASupport() {
  if (typeof window === 'undefined') return true; // SSR: assume supported
  const ua = navigator.userAgent || '';

  // iOS Safari: supports A2HS via share sheet
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isIOSSafari = isIOS && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  if (isIOSSafari) return true;

  // Firefox — does not support beforeinstallprompt on any platform
  // Matches: Firefox, FxiOS (Firefox iOS), Focus
  if (/Firefox|FxiOS/.test(ua) && !/Seamonkey/.test(ua)) return false;

  // Opera Mini — no service worker support
  if (/Opera Mini/.test(ua)) return false;

  // In-app WebViews (FBAV = Facebook, Instagram etc.)
  if (/FBAN|FBAV|Instagram|LinkedInApp/.test(ua)) return false;

  // IE and legacy EdgeHTML
  if (/MSIE|Trident|Edge\/\d/.test(ua)) return false;

  // Everything else (Chrome, Edge Chromium, Samsung, Brave, Vivaldi, etc.)
  return true;
}

export default function Footer() {
  const [pwaSupported, setPwaSupported] = useState(true);

  useEffect(() => {
    setPwaSupported(detectPWASupport());
  }, []);

  return (
    <footer className="border-t border-border/50 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* PWA Install Banner */}
        <div className="mb-6 rounded-xl border border-border/50 bg-primary/5 px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Download className="w-4 h-4 text-primary" />
              Install as a desktop app
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              In Chrome or Edge, click the install icon (⊕) in your browser's address bar, or use the
              install card above to add SparkUtilities to your home screen. It works fully offline — all
              conversion still happens on your machine.
            </p>
          </div>
          <a
            href="/windows-context-menu/README.md"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            Right-click integration
          </a>
        </div>

        {/* Bottom row */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Built By */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Built by</span>
            <div className="group cursor-default">
              <div className="h-8 px-3 rounded-lg bg-primary/10 flex items-center justify-center transition-all duration-500 group-hover:glow group-hover:bg-primary/20">
                <span className="font-display font-bold text-sm text-primary transition-all duration-500 group-hover:glow-text">
                  Harry X.
                </span>
              </div>
            </div>
          </div>

          {/* Tagline */}
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 text-center">
            Made with <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" /> — Innovation is Key.
          </p>

          {/* Contact */}
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">© SparkUtilities</span>
            <div className="flex items-center gap-3">
              {/* Discord */}
              <div className="relative group cursor-default">
                <svg className="w-5 h-5 text-muted-foreground transition-all duration-300 group-hover:text-primary group-hover:drop-shadow-[0_0_8px_var(--glow-color)]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-lg bg-popover border border-border text-xs text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 shadow-lg translate-y-1 group-hover:translate-y-0">
                  ogexr.
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-border" />
                </div>
              </div>
              {/* Gmail */}
              <div className="relative group cursor-default">
                <svg className="w-5 h-5 text-muted-foreground transition-all duration-300 group-hover:text-primary group-hover:drop-shadow-[0_0_8px_var(--glow-color)]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
                </svg>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-lg bg-popover border border-border text-xs text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 shadow-lg translate-y-1 group-hover:translate-y-0">
                  harryx2011@gmail.com
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-border" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Browser PWA compatibility notice — only shown on unsupported browsers */}
        {!pwaSupported && (
          <p className="mt-4 text-center text-[11px] text-foreground/60">
            Installing this app isn't allowed on your current browser.
          </p>
        )}
      </div>
    </footer>
  );
}
