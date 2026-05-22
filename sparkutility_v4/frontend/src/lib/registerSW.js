/**
 * registerSW.js
 * Registers the service worker and surfaces install progress so the PWA
 * loading bar can show real-time feedback when the app is opened for the
 * first time or after an update.
 *
 * Progress callbacks are dispatched as a custom DOM event:
 *   window.dispatchEvent(new CustomEvent('sw-progress', { detail: { pct } }))
 */

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (!import.meta.env.PROD) return;

  // Listen for messages from the SW before registration completes so we
  // don't miss the install-progress messages.
  navigator.serviceWorker.addEventListener('message', (event) => {
    const { data } = event;
    if (!data) return;

    if (data.type === 'SW_INSTALL_PROGRESS') {
      const pct = Math.round((data.current / data.total) * 100);
      window.dispatchEvent(new CustomEvent('sw-progress', { detail: { pct, phase: data.phase } }));
    } else if (data.type === 'SW_INSTALL_DONE') {
      window.dispatchEvent(new CustomEvent('sw-progress', { detail: { pct: 100, done: true } }));
    }
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        // If a new SW is installing right now, track its state changes.
        const trackInstalling = (sw) => {
          if (!sw) return;
          sw.addEventListener('statechange', () => {
            if (sw.state === 'installed') {
              window.dispatchEvent(new CustomEvent('sw-updated', {}));
            }
          });
        };
        trackInstalling(reg.installing);
        reg.addEventListener('updatefound', () => trackInstalling(reg.installing));
      })
      .catch((err) => {
        console.warn('SW registration failed:', err);
      });
  });
}
