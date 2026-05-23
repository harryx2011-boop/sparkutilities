import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');
const PORT = process.env.PORT || 2000;
const DEV_HOST = process.env.DEV_HOST || 'sparkutilities.dev';

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

function loadJson(name, fallback) {
  try {
    const file = join(DATA_DIR, name);
    if (!existsSync(file)) return fallback;
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function saveJson(name, data) {
  writeFileSync(join(DATA_DIR, name), JSON.stringify(data, null, 2), 'utf8');
}

const ALLOWED_CATEGORIES   = new Set(['video', 'audio', 'image', 'document']);
const FORMAT_RE            = /^[A-Za-z0-9]{1,8}$/;
const ALLOWED_SIZE_BUCKETS = new Set(['<10MB', '10-100MB', '100MB-1GB', '>1GB', 'unknown']);

function validateAnalyticsEvent(input) {
  if (!input || typeof input !== 'object') return null;
  const cat = input.category;
  const target = input.targetFormat;
  const source = input.sourceFormat;
  if (!ALLOWED_CATEGORIES.has(cat)) return null;
  if (typeof target !== 'string' || !FORMAT_RE.test(target)) return null;
  if (source !== undefined && (typeof source !== 'string' || !FORMAT_RE.test(source))) return null;
  return {
    category: cat,
    targetFormat: target.toUpperCase(),
    sourceFormat: source ? source.toUpperCase() : null,
    sizeBucket: ALLOWED_SIZE_BUCKETS.has(input.sizeBucket) ? input.sizeBucket : 'unknown',
  };
}

const app = express();
app.disable('x-powered-by');

const trustProxy = parseInt(process.env.TRUST_PROXY || '0', 10);
if (trustProxy > 0) app.set('trust proxy', trustProxy);

const RATE_LIMIT_VALIDATE = {
  trustProxy:          false,
  xForwardedForHeader: false,
};

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // 'unsafe-eval' / 'unsafe-inline' required by ffmpeg.wasm; blob: needed for ffmpeg core script.
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'blob:'],
      workerSrc: ["'self'", 'blob:'],
      connectSrc: ["'self'", 'blob:'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'same-origin' },
}));

const allowedOrigins = (process.env.CORS_ORIGINS || `http://localhost:9000,http://${DEV_HOST}:9000`).split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  credentials: false,
}));

app.use(express.json({ limit: '32kb' }));

app.use(rateLimit({
  windowMs: 60_000,
  max: 240,
  standardHeaders: true,
  legacyHeaders: false,
  validate: RATE_LIMIT_VALIDATE,
  message: { error: 'Too many requests' },
}));

function loadAnalytics() {
  return loadJson('analytics.json', {
    totals: { conversions: 0 },
    byCategory: {},
    byTarget: {},
    bySource: {},
    bySizeBucket: {},
    daily: {},
    lastEvents: [],
  });
}

const ANALYTICS_LAST_CAP = 500;

app.post('/api/analytics/event', (req, res) => {
  const ev = validateAnalyticsEvent(req.body || {});
  if (!ev) return res.status(400).json({ error: 'Invalid event' });
  const a = loadAnalytics();
  const day = new Date().toISOString().slice(0, 10);

  a.totals.conversions = (a.totals.conversions || 0) + 1;
  a.byCategory[ev.category] = (a.byCategory[ev.category] || 0) + 1;
  a.byTarget[ev.targetFormat] = (a.byTarget[ev.targetFormat] || 0) + 1;
  if (ev.sourceFormat) a.bySource[ev.sourceFormat] = (a.bySource[ev.sourceFormat] || 0) + 1;
  a.bySizeBucket[ev.sizeBucket] = (a.bySizeBucket[ev.sizeBucket] || 0) + 1;
  a.daily[day] = (a.daily[day] || 0) + 1;

  a.lastEvents.unshift({ ts: Date.now(), category: ev.category, source: ev.sourceFormat, target: ev.targetFormat });
  if (a.lastEvents.length > ANALYTICS_LAST_CAP) a.lastEvents.length = ANALYTICS_LAST_CAP;

  saveJson('analytics.json', a);
  res.status(204).end();
});

// SSRF guard — reject private / loopback / link-local addresses.
function isPrivateHost(hostname) {
  if (!hostname) return true;
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h === '0.0.0.0' || h === '::1' || h === '::') return true;
  const ipv6 = h.startsWith('[') && h.endsWith(']') ? h.slice(1, -1) : h;
  if (ipv6.includes(':')) {
    if (ipv6 === '::1' || ipv6.startsWith('fe80:') || ipv6.startsWith('fc') || ipv6.startsWith('fd')) return true;
    return false;
  }
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b, c] = [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
  if (a === 127 || a === 10 || a === 0) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

const PREVIEW_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const PREVIEW_MAX_BYTES = 512 * 1024;

function decodeHtmlEntities(s) {
  if (!s) return s;
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractMeta(html, attrName, attrValue) {
  const v = escapeRe(attrValue);
  const a = escapeRe(attrName);
  let re = new RegExp(`<meta[^>]*\\b${a}\\s*=\\s*["']${v}["'][^>]*>`, 'i');
  let tag = html.match(re);
  if (tag) {
    const c = tag[0].match(/content\s*=\s*["']([^"']*)["']/i);
    if (c) return decodeHtmlEntities(c[1].trim());
  }
  // content-first ordering
  re = new RegExp(`<meta[^>]*content\\s*=\\s*["']([^"']*)["'][^>]*\\b${a}\\s*=\\s*["']${v}["'][^>]*>`, 'i');
  tag = html.match(re);
  if (tag) return decodeHtmlEntities(tag[1].trim());
  return null;
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? decodeHtmlEntities(m[1].replace(/\s+/g, ' ').trim()) : null;
}

function extractFavicon(html) {
  const re = /<link[^>]+rel\s*=\s*["']([^"']*icon[^"']*)["'][^>]*>/gi;
  let best = null;
  let bestScore = -1;
  let m;
  while ((m = re.exec(html)) !== null) {
    const tag = m[0];
    const href = tag.match(/href\s*=\s*["']([^"']+)["']/i);
    if (!href) continue;
    const rel = m[1].toLowerCase();
    const score = rel === 'icon' ? 3 : rel === 'shortcut icon' ? 2 : rel.includes('apple-touch') ? 1 : 0;
    if (score > bestScore) { bestScore = score; best = href[1].trim(); }
  }
  return best;
}

async function fetchWithLimit(url) {
  const res = await fetch(url, {
    method: 'GET',
    redirect: 'follow',
    signal: AbortSignal.timeout(6000),
    headers: {
      'User-Agent': PREVIEW_UA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });
  if (!res.ok) throw new Error(`Upstream ${res.status}`);
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  if (ct && !ct.includes('html') && !ct.includes('xml') && !ct.includes('text')) {
    throw new Error('Not HTML');
  }
  if (!res.body) throw new Error('Empty body');
  const reader = res.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > PREVIEW_MAX_BYTES) {
      try { await reader.cancel(); } catch {}
      break;
    }
    chunks.push(value);
  }
  const buf = new Uint8Array(total > PREVIEW_MAX_BYTES ? PREVIEW_MAX_BYTES : total);
  let off = 0;
  for (const c of chunks) {
    const take = Math.min(c.byteLength, buf.length - off);
    buf.set(c.subarray(0, take), off);
    off += take;
    if (off >= buf.length) break;
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(buf);
}

const previewLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  validate: RATE_LIMIT_VALIDATE,
  message: { error: 'Too many preview requests' },
});

app.get('/api/preview', previewLimiter, async (req, res) => {
  const raw = typeof req.query.url === 'string' ? req.query.url : '';
  if (!raw || raw.length > 2048) return res.status(400).json({ error: 'Missing or oversized url' });
  let parsed;
  try { parsed = new URL(raw); } catch { return res.status(400).json({ error: 'Invalid URL' }); }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return res.status(400).json({ error: 'Only http(s) URLs are allowed' });
  }
  if (isPrivateHost(parsed.hostname)) {
    return res.status(400).json({ error: 'Private/loopback hosts are not allowed' });
  }
  try {
    const html = await fetchWithLimit(parsed.toString());

    const ogTitle     = extractMeta(html, 'property', 'og:title');
    const ogDesc      = extractMeta(html, 'property', 'og:description');
    const ogImage     = extractMeta(html, 'property', 'og:image')
                     || extractMeta(html, 'property', 'og:image:url')
                     || extractMeta(html, 'name', 'twitter:image');
    const ogSite      = extractMeta(html, 'property', 'og:site_name');
    const metaDesc    = extractMeta(html, 'name', 'description');
    const docTitle    = extractTitle(html);
    const faviconHref = extractFavicon(html);

    const absolutize = (href) => {
      if (!href) return null;
      try { return new URL(href, parsed).toString(); } catch { return null; }
    };

    res.set('Cache-Control', 'public, max-age=6');
    res.json({
      url:         parsed.toString(),
      title:       ogTitle || docTitle || null,
      description: ogDesc  || metaDesc || null,
      image:       absolutize(ogImage),
      siteName:    ogSite || parsed.hostname.replace(/^www\./, ''),
      favicon:     absolutize(faviconHref) || `${parsed.protocol}//${parsed.host}/favicon.ico`,
    });
  } catch (err) {
    const msg = err?.name === 'TimeoutError' || err?.name === 'AbortError'
      ? 'Upstream timed out' : (err?.message || 'Preview failed');
    res.status(502).json({ error: msg });
  }
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const isRateLimitValidation = err?.name === 'ValidationError' && typeof err?.code === 'string' && err.code.startsWith('ERR_ERL_');
  if (isRateLimitValidation) {
    console.error(`[server] express-rate-limit validation tripped (${err.code}): ${err.message}. Tune validate config or set TRUST_PROXY.`);
  } else {
    console.error('[server]', err?.message || err);
  }
  if (res.headersSent) return;
  if (err && err.message === 'Not allowed by CORS') return res.status(403).json({ error: 'Forbidden' });
  if (err && err.type === 'entity.too.large') return res.status(413).json({ error: 'Payload too large' });
  if (err && err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
  if (isRateLimitValidation) return res.status(503).json({ error: 'Rate limiter misconfigured — see server logs' });
  res.status(500).json({ error: 'Internal error' });
});

const httpServer = app.listen(PORT, () => {
  console.log(`SparkUtilities API listening on http://${DEV_HOST}:${PORT}`);
});

httpServer.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`\n[server] Port ${PORT} is already in use.`);
    console.error('[server] Most likely cause: a previous backend instance is still running.');
    console.error(`[server] Find and kill it, or run on a different port: PORT=${Number(PORT) + 1} node server.js\n`);
    process.exit(1);
  }
  throw err;
});
