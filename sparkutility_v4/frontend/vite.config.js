import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
plugins: [
  react(),
  {
    name: 'configure-response-headers',
    configureServer(server) {
      server.middlewares.use((_req, res, next) => {
        res.setHeader('Cross-Origin-Opener-Policy',   'same-origin');
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((_req, res, next) => {
        res.setHeader('Cross-Origin-Opener-Policy',   'same-origin');
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
        next();
      });
    },
  },
 viteStaticCopy({
  // We ship two FFmpeg cores side-by-side:
  //   • @ffmpeg/core-mt — multi-threaded build. Requires SharedArrayBuffer,
  //     which requires cross-origin isolation (COOP same-origin + COEP
  //     require-corp + a navigation served with those headers). Spawns one
  //     Web Worker per CPU thread, so encoding scales with the user's hardware.
  //   • @ffmpeg/core    — single-threaded fallback. No SAB, no COOP/COEP,
  //     no Web Worker. ~3-5× slower for video, but it always works — we
  //     load it transparently when crossOriginIsolated is false.
  // The runtime decision lives in ConversionCard.jsx → getFFmpeg().
  // vite-plugin-static-copy v4 preserves source directory structure. We use
  // structured-rename to collapse each core back to a flat /dist root so the
  // FFmpeg loader can fetch them via toBlobURL('/ffmpeg-core.js'), etc.
  // Both the mt and the single-threaded fallback are emitted side-by-side.
  targets: [
    // Multi-threaded core (SharedArrayBuffer-only). Used when the page is
    // cross-origin-isolated.
    { src: 'node_modules/@ffmpeg/core-mt/dist/esm/ffmpeg-core.js',        dest: '.', rename: { stripBase: true, name: 'ffmpeg-core.js'        } },
    { src: 'node_modules/@ffmpeg/core-mt/dist/esm/ffmpeg-core.wasm',      dest: '.', rename: { stripBase: true, name: 'ffmpeg-core.wasm'      } },
    { src: 'node_modules/@ffmpeg/core-mt/dist/esm/ffmpeg-core.worker.js', dest: '.', rename: { stripBase: true, name: 'ffmpeg-core.worker.js' } },
    // Single-threaded fallback. Used when the host doesn't set COOP/COEP, the
    // page is loaded in an in-app webview, or the browser has no SAB. Slower
    // but always works.
    { src: 'node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.js',           dest: '.', rename: { stripBase: true, name: 'ffmpeg-core-st.js'     } },
    { src: 'node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.wasm',         dest: '.', rename: { stripBase: true, name: 'ffmpeg-core-st.wasm'   } },
  ],
}),
],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    // Frontend dev port. Moved from Vite's stock 5173 to 9000 in v3.3.5
    // (less likely to clash with other React/Vite projects on the same box).
    // CORS_ORIGINS in backend/.env must include http://localhost:9000 (and
    // optionally http://sparkutilities.dev:9000) for /api/* calls to succeed.
    port: 9000,
    // The backend binds to port 2000. The proxy target defaults to
    // localhost — which always resolves on every machine without any
    // /etc/hosts setup. The previous default was sparkutilities.dev,
    // which silently 500'd when the user's machine had no hosts entry
    // (Vite's http-proxy gets ENOTFOUND and surfaces it as a generic
    // 500 with Content-Type: text/plain — the most-reported symptom
    // of this was an "admin login failed (500)" toast).
    //
    // Override with VITE_API_TARGET=http://sparkutilities.dev:2000 in
    // .env.local if you've added the hosts entry and want to exercise
    // the dev-domain path locally. Leave the default for everyone else.
    proxy: {
      '/api': {
        target:       process.env.VITE_API_TARGET || 'http://localhost:2000',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    // ffmpeg.wasm loads workers dynamically — exclude from pre-bundling
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
  build: {
    // Bumped from the 500 KB default — our Admin/AnalyticsDashboard chunk
    // legitimately carries Recharts and runs only behind login.
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Manual chunks so heavy libraries that aren't on the critical path
        // don't end up bundled into every page's primary chunk. Each entry
        // pulls a related set of modules into a single, separately-cached chunk
        // — Vite emits one network request the first time it's needed and the
        // SW caches it from there. The split is conservative; we only bucket
        // libraries that are >100 KB minified or are clearly non-critical.
        manualChunks: {
          // Charts are admin-dashboard-only and >300 KB minified.
          'vendor-recharts':  ['recharts'],
          // PDF read/write — only File Converter + document utilities pull these.
          'vendor-pdf':       ['pdfjs-dist', 'jspdf', 'pdf-lib'],
          // Markdown rendering — Blog and the Markdown FluxKit utility.
          'vendor-markdown':  ['react-markdown'],
          // Icon library — heavy due to the breadth of imports across pages.
          'vendor-icons':     ['lucide-react'],
          // Animation engine — used everywhere but heavy enough to deserve isolation.
          'vendor-motion':    ['framer-motion'],
          // Drag-and-drop, used by the Bug Reports admin and a couple FluxKit tools.
          'vendor-dnd':       ['@hello-pangea/dnd'],
          // Date/time libs — moment is heavy; date-fns is leaner but still worth pinning.
          'vendor-time':      ['moment', 'date-fns'],
          // Office docs — Mammoth for .docx, JSZip for archive ops.
          'vendor-office':    ['mammoth', 'jszip'],
          // Spreadsheet I/O is intentionally NOT in manualChunks — read-excel-file
          // and write-excel-file only expose subpath exports, not a bare specifier,
          // and Vite errors when manualChunks can't resolve the entry. They get
          // bundled into whichever chunk first imports them, which is fine.
        },
      },
    },
  },
})
