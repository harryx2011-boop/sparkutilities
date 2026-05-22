# SparkUtilities

A browser-first utility hub: file conversion, image editing, dev tools, and media downloads. Everything runs client-side via WebAssembly / WebGL where possible — the backend only exists for the YouTube downloader and a small analytics/admin surface.

**Current version:** v4.0

## Repository layout

```
sparkutility_v4/
├── frontend/   # React 18 + Vite + Tailwind + shadcn/ui
└── backend/    # Express ESM, JSON-file persistence, no DB
```

## Quick start

### Backend

```bash
cd sparkutility_v4/backend
cp .env.example .env
# Edit .env if you need to override defaults (CORS origins, yt-dlp path, etc.).
npm install
npm start
```

### Frontend

```bash
cd sparkutility_v4/frontend
npm install
npm run dev
```

By default the Vite dev server proxies `/api/*` to `http://localhost:2000`. Override with `VITE_API_TARGET` if needed.

## Notes

- **ESM throughout** — both halves use `"type": "module"`.
- **No TypeScript** — plain JS with JSDoc where types matter.
- **Path alias** `@/` → `frontend/src/`.
- **COOP / COEP headers** are required in production for multi-threaded FFmpeg (`Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp`). The Vite dev server sets these; production hosting must set them independently.
- The **YouTube downloader** is the only feature that requires the backend. It depends on `yt-dlp` being available on the server's `PATH` (override with `YT_DLP_PATH`).

## License

[MIT](./LICENSE)
