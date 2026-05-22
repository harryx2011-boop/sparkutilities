// SparkUtility service worker — offline-friendly cache + PWA load progress.
// v1.04 — preserves COOP/COEP cross-origin isolation when serving cached
// responses, so SharedArrayBuffer (and the @ffmpeg/core-mt multi-threaded
// build) keeps working after the SW takes over. v1.03.1 reports install
// progress via postMessage so the app can show a real-time loading bar.
//
// Why the COOP/COEP injection matters:
//   • Cross-origin isolation is granted to a navigation only if the response
//     carries Cross-Origin-Opener-Policy: same-origin AND Cross-Origin-
//     Embedder-Policy: require-corp. The Vite dev middleware and the
//     production host set both headers on the live response.
//   • A naive service worker that simply returns `caches.match(req)` strips
//     those headers — Cache API responses do not preserve them by default
//     unless the SW re-emits them. The page reloads from cache and SAB is
//     silently disabled.
//   • Below, every cache-served Response is re-wrapped with the headers, so
//     isolation survives offline reloads, the install progress flow, and
//     stale-while-revalidate.

// v1.05 — Pre-caches the FFmpeg multi-threaded + single-threaded WASM cores
// at install time so the File Converter boots offline. Route chunks still
// flow through the runtime stale-while-revalidate path because their
// content-hashed filenames change every Vite build; we can't hardcode them.
const VERSION = 'sparkutility-v1.05';
const SHELL_CACHE   = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;

// Inject the cross-origin isolation headers onto every response we hand back
// from cache. Cheap clone — body is a stream, headers are a plain map — and
// it keeps SharedArrayBuffer alive across SW-served navigations.
function withIsolationHeaders(response) {
  if (!response || !response.ok) return response;
  const headers = new Headers(response.headers);
  headers.set('Cross-Origin-Opener-Policy',   'same-origin');
  headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
  // Same-origin assets need CORP for COEP to admit them. Setting it on
  // every response is harmless — only same-origin resources flow through
  // the SW, and CORP same-origin is the strictest (most-isolating) value.
  if (!headers.has('Cross-Origin-Resource-Policy')) {
    headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  }
  return new Response(response.body, {
    status:     response.status,
    statusText: response.statusText,
    headers,
  });
}

const SHELL_ASSETS = [
  '/',
  '/favicon.svg',
  '/manifest.webmanifest',
  // FFmpeg WASM cores — these have stable filenames (Vite copies them
  // verbatim via vite-plugin-static-copy with `stripBase: true`). Pre-caching
  // them at install time means the File Converter is available offline as
  // soon as the SW finishes its first install pass. Each core is several
  // megabytes so we cache once and stale-while-revalidate from there.
  '/ffmpeg-core.js',
  '/ffmpeg-core.wasm',
  '/ffmpeg-core.worker.js',
  '/ffmpeg-core-st.js',
  '/ffmpeg-core-st.wasm',
];

// ── Install: cache shell, report progress to all clients ─────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      const total = SHELL_ASSETS.length;

      // Cache each shell asset individually so we can report per-item progress.
      for (let i = 0; i < SHELL_ASSETS.length; i++) {
        try {
          await cache.add(SHELL_ASSETS[i]);
        } catch {
          // Non-fatal — the asset may not exist in dev builds.
        }
        broadcastProgress({
          type:    'SW_INSTALL_PROGRESS',
          current: i + 1,
          total,
          phase:   'install',
        });
      }

      broadcastProgress({ type: 'SW_INSTALL_DONE' });
      await self.skipWaiting();
    })()
  );
});

// ── Activate: purge old caches ────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(k => k !== SHELL_CACHE && k !== RUNTIME_CACHE)
            .map(k  => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Network-first for navigations — keeps deploys rolling out quickly.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then(c => c.put(req, copy)).catch(() => {});
          // Network response already carries COOP/COEP from the host; pass
          // through as-is. (Re-wrapping the body would double-buffer it.)
          return res;
        })
        .catch(() =>
          caches.match(req)
            .then(r => r || caches.match('/'))
            // Offline path: cached navigation responses lose COOP/COEP, so
            // we re-stamp the headers before handing back to the browser.
            // Without this, opening the app offline drops crossOriginIsolated
            // to false and the multi-threaded FFmpeg core fails with a
            // "shared memory not enabled" error.
            .then(withIsolationHeaders)
        )
    );
    return;
  }

  // Stale-while-revalidate for all other static assets.
  event.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req)
        .then(res => {
          if (res.ok && (res.type === 'basic' || res.type === 'default')) {
            const copy = res.clone();
            caches.open(RUNTIME_CACHE).then(c => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached && withIsolationHeaders(cached));
      // Same-origin asset cached without isolation headers — re-stamp on the
      // way out so a reload that hits cache before the network keeps SAB.
      return cached ? withIsolationHeaders(cached) : network;
    })
  );
});

// ── Message: manual skip-waiting trigger ─────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// ── Helper: post to all clients ───────────────────────────────────────────────
async function broadcastProgress(data) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  for (const client of clients) {
    try { client.postMessage(data); } catch { /* ignore closed clients */ }
  }
}
