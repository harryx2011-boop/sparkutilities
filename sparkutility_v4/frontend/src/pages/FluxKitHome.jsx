import { useRef, useState, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Database, Zap, ArrowRight, Palette, ShieldCheck,
  Terminal, Code2, Wrench, Hash, ChevronRight, CheckCircle2,
} from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import FluxBackdrop from '@/components/fluxkit/FluxBackdrop';

const FK_SETTINGS_KEY = 'aio_fluxkit_settings';

// Shared FluxKit design tokens — mirror Web Dev Assets, Productivity, etc.
// Headings use Cormorant Garamond (editorial), body uses Montserrat, code
// labels use JetBrains Mono. GOLD is the canonical FluxKit accent.
const FH   = { fontFamily: '"Cormorant Garamond","Georgia",serif', fontWeight: 700, letterSpacing: '-0.02em' };
const FB   = { fontFamily: '"Montserrat","Inter",sans-serif' };
const FM   = { fontFamily: '"JetBrains Mono",monospace' };
const GOLD = '#FACC15';

const BADGE_CLASS = {
  Live:    'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  New:     'bg-green-500/20 text-green-400 border border-green-500/30',
  Beta:    'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  Updated: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  Soon:    'bg-neutral-500/20 text-neutral-400 border border-neutral-500/30',
};

function loadFKSettings() {
  try {
    const raw = localStorage.getItem(FK_SETTINGS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const FLUX_CATEGORIES = [
  {
    path: '/fluxkit/data-structure',
    icon: Database,
    label: 'Data & Structure',
    tagline: 'JSON · XML · CSV · YAML · SQL',
    description: 'Validate, convert, and format structured data formats. From JSON fixers to SQL beautifiers — the dev toolkit for modern data wrangling.',
    badgeLabel: 'Live',
    badgeClass: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    features: ['JSON Validator', 'XML→JSON', 'CSV→JSON', 'YAML↔JSON', 'SQL Formatter'],
  },
  {
    path: '/fluxkit/web-dev-assets',
    icon: Palette,
    label: 'Web Dev Assets',
    tagline: 'CSS · SVG · Flexbox · Grid · Colours',
    description: 'Five visual CSS generators with live previews — glassmorphism, SVG path optimisation, flexbox/grid playground, hex colour conversion, and custom scrollbar builder.',
    badgeLabel: 'Live',
    badgeClass: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    features: ['Glassmorphism', 'SVG Optimizer', 'Flexbox/Grid', 'Hex Converter', 'Scrollbar Builder'],
  },
  {
    path: '/fluxkit/security-logic',
    icon: ShieldCheck,
    label: 'Security & Logic',
    tagline: 'JWT · Regex · Cron · Bcrypt · HTML',
    description: 'Five security and logic utilities — JWT decoder, regex tester with live match highlighting, cron expression parser, bcrypt hash generator, and HTML entity encoder.',
    badgeLabel: 'Live',
    badgeClass: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    features: ['JWT Debugger', 'Regex Tester', 'Cron Parser', 'Bcrypt Generator', 'HTML Entities'],
  },
  {
    path: '/fluxkit/productivity',
    icon: Wrench,
    label: 'Productivity Tools',
    tagline: 'Diff · Console · cURL · Markdown · URL',
    description: 'Speed tools for everyday dev friction — diff viewer, styled console log generator, cURL→Fetch/Axios converter, live Markdown preview, and URL parser.',
    badgeLabel: 'New',
    badgeClass: 'bg-green-500/20 text-green-400 border border-green-500/30',
    features: ['Diff Viewer', 'Console Log Gen', 'cURL→Fetch', 'Markdown Preview', 'URL Parser'],
  },
  {
    path: '/fluxkit/latex-builder',
    icon: Hash,
    label: 'LaTeX Builder',
    tagline: 'Equations · KaTeX · Matrix · Alt-Text · Export',
    description: 'Build mathematical expressions visually with a live KaTeX preview. Insert symbols, generate matrices, wrap annotations, auto-generate accessible alt-text, and export as PNG.',
    badgeLabel: 'New',
    badgeClass: 'bg-green-500/20 text-green-400 border border-green-500/30',
    features: ['Live KaTeX Preview', 'Symbol Palette', 'Matrix Builder', 'Alt-Text Gen', 'PNG Export', 'Equation History'],
  },
];

const WHY_ITEMS = [
  {
    icon: Terminal,
    title: '100% In-Browser',
    body: 'Every tool executes directly in your browser tab — no server round-trips, no file uploads, no accounts required. Your data stays on your device.',
  },
  {
    icon: Zap,
    title: 'Instant Output',
    body: 'Results update as you type. Every tool is designed for real-time feedback — no loading spinners, no submit buttons, no waiting.',
  },
  {
    icon: Code2,
    title: 'Built for Developers',
    body: 'Precision tooling with production-quality output. Copyable snippets, syntax-aware formatting, and interfaces designed for developer workflows.',
  },
];

const CODE_LINES = [
  'const data = await fetch("/api/tools").then(r => r.json());',
  'export default function FluxKit({ tools }) {',
  '  const [active, setActive] = useState(null);',
  '  return tools.map(t => <ToolCard key={t.id} {...t} />);',
  '}',
  'function parseJSON(input) {',
  '  try { return JSON.parse(input); }',
  '  catch (e) { return autoFix(input); }',
  '}',
  'const regex = /^(?<year>\\d{4})-(?<month>\\d{2})/;',
  'SELECT id, name FROM tools WHERE status = "live";',
  'const hash = await bcrypt.hash(password, 12);',
  '{"type":"object","properties":{"id":{"type":"string"}}}',
  'docker run --rm -it fluxkit:latest bash',
  '.container { display: flex; gap: 1rem; }',
  'curl -X POST /api/convert -d @file.json',
  'git commit -m "feat: add SQL formatter tool"',
  'const jwt = sign({ sub: userId }, SECRET, { expiresIn: "1h" });',
  'yaml.dump({ version: "3", services: { app: { image: "node" } } })',
  'import { validate } from "fluxkit/json";',
  'Object.entries(schema).map(([k, v]) => `${k}: ${v.type}`)',
  '/* FluxKit — precision dev tools in your browser */',
  'npm install fluxkit --save-dev',
  'export const VERSION = "3.0.0";',
  'const [output, setOutput] = useState("");',
  'if (expr.test(input)) highlight(match.index, match[0].length);',
  'const diff = computeLineDiff(original, modified);',
  'function formatSQL(raw) { return raw.replace(/\\s+/g, " ").trim(); }',
  '// @ts-check — strict mode enabled',
  'z.object({ name: z.string(), age: z.number().min(0) })',
  'res.setHeader("Content-Security-Policy", "default-src \'self\'");',
  'const [copied, setCopied] = useState(false);',
  'await Promise.all(files.map(f => convert(f, opts)));',
  'type Tool = { id: string; label: string; active: boolean };',
  'console.log("%c[FluxKit]", "color: #FACC15; font-weight:bold;", data);',
  'import * as d3 from "d3"; // visualisation',
  'SELECT COUNT(*) FROM logs WHERE level = \'error\' AND ts > NOW() - INTERVAL \'1h\';',
  '<input type="text" value={input} onChange={e => setInput(e.target.value)} />',
  'const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));',
  'export { default as useDebounce } from "./useDebounce";',
];

function LiveCodeBackground({ disabled }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let w, h;

    const FONT_SIZE = 12;
    const LINE_H = 21;
    const SPEED_BASE = 0.22;

    let columns = [];

    function buildColumns() {
      const COLS = Math.max(6, Math.floor(w / 120));
      columns = Array.from({ length: COLS }, (_, i) => ({
        y: -Math.random() * CODE_LINES.length * LINE_H,
        speed: SPEED_BASE * (0.4 + Math.random() * 1.2),
        hueOffset: Math.floor(Math.random() * 40) - 15,
        opacityMod: 0.6 + Math.random() * 0.7,
        fontSize: FONT_SIZE + (Math.random() > 0.6 ? 1 : 0),
        colX: (i / COLS) * w + (i % 2 === 0 ? 14 : 28),
      }));
    }

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildColumns();
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);

      columns.forEach((col, ci) => {
        ctx.font = `${col.fontSize}px "JetBrains Mono", "Fira Code", monospace`;

        const startLine = Math.floor(col.y / LINE_H);
        const visibleLines = Math.ceil(h / LINE_H) + 2;

        for (let li = 0; li < visibleLines; li++) {
          const lineNum = ((startLine + li) % CODE_LINES.length + CODE_LINES.length) % CODE_LINES.length;
          const textY = col.y % LINE_H === 0
            ? li * LINE_H
            : li * LINE_H - (col.y % LINE_H);

          const distFromTop = textY / h;
          const distFromBottom = 1 - distFromTop;
          const edgeFade = Math.min(distFromTop / 0.15, distFromBottom / 0.15, 1);
          const alpha = edgeFade * 0.19 * col.opacityMod;

          const hue = 44 + ci * 5 + col.hueOffset;
          const sat = 68 + (lineNum % 3) * 9;
          ctx.fillStyle = `hsla(${hue}, ${sat}%, 63%, ${alpha})`;
          ctx.fillText(CODE_LINES[lineNum], col.colX, textY);
        }

        col.y += col.speed;
        if (col.y > CODE_LINES.length * LINE_H) col.y -= CODE_LINES.length * LINE_H;
      });

      animId = requestAnimationFrame(draw);
    }

    resize();
    draw();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [disabled]);

  if (disabled) return null;

  return (
    <div className="relative w-full" style={{ height: '260px' }}>
      <div className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: 'linear-gradient(to bottom, var(--background) 0%, transparent 18%, transparent 82%, var(--background) 100%)',
        }}
      />
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
    </div>
  );
}

/** @param {{ cat: typeof FLUX_CATEGORIES[number], index: number, badgeLabel?: string, badgeClass?: string }} props */
function CategoryCard({ cat, index, badgeLabel, badgeClass }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const navigate = useNavigate();
  const Icon = cat.icon;
  const resolvedBadgeLabel = badgeLabel ?? cat.badgeLabel;
  const resolvedBadgeClass = badgeClass ?? cat.badgeClass;

  const handleNavigate = () => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    navigate(cat.path);
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 36 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="group glass-card rounded-2xl border border-yellow-900/30 overflow-hidden hover:border-yellow-500/35 transition-all"
      style={{ boxShadow: '0 0 40px rgba(234,179,8,0.07)' }}
    >
      <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, #FACC15, #92400E)' }} />
      <div className="p-5 sm:p-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #FACC15, #92400E)' }}>
              <Icon className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h3 style={{ ...FH, fontSize: '1.5rem', color: '#F5F0E8' }}>{cat.label}</h3>
                {resolvedBadgeLabel && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${resolvedBadgeClass}`}>{resolvedBadgeLabel}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground tracking-wide" style={FM}>{cat.tagline}</p>
            </div>
          </div>
          <button
            onClick={handleNavigate}
            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-black opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0 whitespace-nowrap flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #FACC15, #F97316)' }}
          >
            Open <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed mb-5">{cat.description}</p>

        <div className="flex flex-wrap gap-2 mb-5">
          {cat.features.map((/** @type {string} */ f) => (
            <span key={f} className="text-[11px] px-2.5 py-1 rounded-lg font-mono"
              style={{ background: 'rgba(250,204,21,0.06)', border: '1px solid rgba(250,204,21,0.15)', color: '#FACC15' }}>
              {f}
            </span>
          ))}
        </div>

        <button
          onClick={handleNavigate}
          className="md:hidden w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-black"
          style={{ background: 'linear-gradient(135deg, #FACC15, #F97316)' }}
        >
          Open <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

export default function FluxKitHome() {
  const navigate = useNavigate();
  /** @type {import('react').RefObject<HTMLElement>} */
  const portfolioRef = useRef(null);
  const [fkSettings] = useState(() => loadFKSettings());
  const { settings } = useSettings();

  const scrollToCategories = () => {
    const el = portfolioRef.current;
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const visibleCategories = fkSettings
    ? FLUX_CATEGORIES.filter(c => !fkSettings.categoryHidden?.[c.path.replace('/fluxkit/', '')])
    : FLUX_CATEGORIES;

  const heroTagline = fkSettings?.tagline ||
    'The developer sub-brand of SparkUtilities — precision tooling for data, CSS, security, and everyday dev workflows. All running locally in your browser.';

  const showConnector = fkSettings ? fkSettings.showConnector !== false : true;

  return (
    <div style={{ minHeight: 'calc(100vh - 4rem)', background: '#050505' }}>
      <FluxBackdrop />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-20">

        {/* ── BREADCRUMB ── (matches the five branches) */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center gap-1.5 mb-10"
          style={{ ...FB, fontSize: '0.75rem', color: 'rgba(200,190,170,0.4)' }}>
          <Zap className="w-3 h-3" style={{ color: GOLD, fill: GOLD }} />
          <span style={{ color: GOLD }}>FluxKit</span>
          <ChevronRight className="w-3 h-3" />
          <span>Home</span>
        </motion.div>

        {/* ── BADGE ── (matches branches' uppercase code-style label) */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-sm mb-8"
          style={{
            background: 'rgba(250,204,21,0.08)',
            border: '1px solid rgba(250,204,21,0.25)',
            ...FM, fontSize: '0.68rem', color: GOLD,
            letterSpacing: '0.12em', textTransform: 'uppercase',
          }}>
          <Zap className="w-3 h-3" />
          Developer Toolkit · Browser-Native · Zero Uploads
        </motion.div>

        {/* ── EDITORIAL HEADLINE ── (Cormorant Garamond w/ leading word in GOLD) */}
        <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          style={{
            ...FH,
            fontSize: 'clamp(2.4rem, 6.5vw, 4.75rem)',
            lineHeight: 1.05,
            color: '#F5F0E8',
            marginBottom: '1rem',
          }}>
          <span style={{ color: GOLD }}>Precision</span> dev tools.<br />
          <span>Built for the browser.</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
          style={{
            ...FB,
            fontSize: '0.95rem',
            color: 'rgba(200,190,170,0.6)',
            lineHeight: '1.7',
            maxWidth: '560px',
            marginBottom: '1.75rem',
          }}>
          {heroTagline}
        </motion.p>

        {/* CTAs — match branch-style scale */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}
          className="flex flex-col sm:flex-row gap-3 mb-10">
          <button
            onClick={scrollToCategories}
            className="h-11 px-6 text-sm font-semibold gap-2 text-black flex items-center justify-center rounded-xl transition-all hover:shadow-lg hover:shadow-yellow-500/25 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #FACC15, #F97316)', ...FB }}
          >
            Explore the toolkit <ArrowRight className="w-4 h-4 ml-1" />
          </button>
          <button
            onClick={() => { window.scrollTo({ top: 0, behavior: 'instant' }); navigate('/'); }}
            className="h-11 px-6 text-sm rounded-xl border transition-all"
            style={{
              ...FB,
              borderColor: 'rgba(120,53,15,0.4)',
              color: 'rgba(250,204,21,0.8)',
              background: 'transparent',
            }}
          >
            ← SparkUtilities
          </button>
        </motion.div>

        {/* Divider — same fade-out gold rule the branches use */}
        <motion.div initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.5, delay: 0.32 }}
          className="flex items-center gap-4 mb-12"
          style={{ transformOrigin: 'left' }}>
          <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg,rgba(250,204,21,0.3),transparent)' }} />
          <span style={{ ...FM, fontSize: '0.65rem', color: 'rgba(250,204,21,0.35)' }}>5 categories · 21 live tools</span>
          <div className="h-px w-16" style={{ background: 'rgba(250,204,21,0.1)' }} />
        </motion.div>

      {/* ── STATS BAR ── */}
      <section className="pb-14">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="glass-card rounded-2xl border border-yellow-900/25 overflow-hidden"
          style={{ boxShadow: '0 0 40px rgba(234,179,8,0.06)' }}
        >
          <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, #FACC15, #92400E 60%, transparent)' }} />
          <div className="grid grid-cols-3 divide-x divide-yellow-900/20 py-6">
            {[
              { value: '5',    label: 'Tool Categories' },
              { value: '21',   label: 'Live Tools' },
              { value: '100%', label: 'Browser-Native' },
            ].map(({ value, label }) => (
              <div key={label} className="flex flex-col items-center gap-1 px-4">
                <span className="text-3xl font-display font-bold" style={{ color: '#FACC15' }}>{value}</span>
                <span className="text-xs text-muted-foreground text-center">{label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── WHY FLUXKIT ── */}
      <section className="pb-14">
        <motion.p
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          className="text-xs tracking-[0.25em] uppercase text-yellow-400/70 mb-3 text-center"
          style={FM}
        >
          // Why FluxKit?
        </motion.p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {WHY_ITEMS.map(({ icon: Icon, title, body }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="glass-card rounded-2xl p-6 flex flex-col gap-3 hover:border-yellow-500/25 transition-colors"
              style={{ border: '1px solid rgba(234,179,8,0.15)' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(250,204,21,0.15), rgba(249,115,22,0.1))',
                  border: '1px solid rgba(250,204,21,0.2)',
                }}>
                <Icon className="w-5 h-5" style={{ color: '#FACC15' }} />
              </div>
              <h3 style={{ ...FH, fontSize: '1.25rem', color: '#F5F0E8' }}>{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── LIVE CODING BACKGROUND ── */}
      <div className="relative overflow-hidden" aria-hidden="true">
        <LiveCodeBackground disabled={settings.lowPowerMode} />
      </div>

      {/* ── TOOL CATEGORIES ── */}
      <section ref={portfolioRef} className="pb-16">
        <motion.p
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          className="text-xs tracking-[0.25em] uppercase text-yellow-400/70 mb-3 text-center"
          style={FM}
        >
          // All Tools
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
          style={{
            ...FH,
            fontSize: 'clamp(2rem, 4.5vw, 2.75rem)',
            background: 'linear-gradient(135deg, #FACC15, #F97316)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Everything your workflow demands.
        </motion.h2>
        <div className="grid grid-cols-1 gap-5">
          {visibleCategories.map((cat, i) => {
            const id = cat.path.replace('/fluxkit/', '');
            const overrideLabel = fkSettings?.categoryBadges?.[id];
            const overrideClass = overrideLabel !== undefined ? (BADGE_CLASS[overrideLabel] || '') : undefined;
            return (
              <CategoryCard
                key={cat.path}
                cat={cat}
                index={i}
                badgeLabel={overrideLabel !== undefined ? overrideLabel : undefined}
                badgeClass={overrideClass}
              />
            );
          })}
        </div>
      </section>

      {/* ── SPARKUTILITIES CONNECTOR ── (re-stylized in FluxKit gold, no purple) */}
      {showConnector && <section className="pb-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 border"
          style={{
            background: 'rgba(250,204,21,0.04)',
            borderColor: 'rgba(250,204,21,0.15)',
          }}
        >
          <div className="text-center sm:text-left">
            <p style={{ ...FM, fontSize: '0.65rem', color: 'rgba(250,204,21,0.55)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              // Part of
            </p>
            <h3 style={{ ...FH, fontSize: '1.75rem', color: '#F5F0E8' }}>
              <span style={{ color: GOLD }}>Spark</span>Utilities
            </h3>
            <p style={{ ...FB, fontSize: '0.85rem', color: 'rgba(200,190,170,0.6)', marginTop: '0.4rem', maxWidth: '36rem', lineHeight: 1.6 }}>
              FluxKit is the developer toolkit built into SparkUtilities — alongside File Converter, Image Editor, Audio Modifier, Content Previewer, and YouTube Downloader.
            </p>
          </div>
          <button
            onClick={() => { window.scrollTo({ top: 0, behavior: 'instant' }); navigate('/'); }}
            className="flex-shrink-0 flex items-center gap-2 h-11 px-7 rounded-xl text-sm font-semibold transition-all hover:shadow-lg hover:shadow-yellow-500/20 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #FACC15, #F97316)', color: 'black', ...FB }}
          >
            View SparkUtilities <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </section>}

        {/* ── FOOTER NOTE ── (matches the branches' "all FluxKit tools run 100% in-browser" pin) */}
        <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          transition={{ delay: 0.15 }} className="mt-2 text-center">
          <div className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl"
            style={{ background: 'rgba(250,204,21,0.04)', border: '1px solid rgba(250,204,21,0.13)' }}>
            <CheckCircle2 className="w-4 h-4" style={{ color: 'rgba(250,204,21,0.45)' }} />
            <span style={{ ...FB, fontSize: '0.78rem', color: 'rgba(200,190,170,0.45)' }}>
              All FluxKit tools run 100% in-browser. No data is ever sent to a server.
            </span>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
