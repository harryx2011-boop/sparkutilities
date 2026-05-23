import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Wand2, ArrowRight, Zap, Shield, Cpu, Database, Palette, ShieldCheck, Wrench, Music, Eye, Activity, CalendarDays, HardDrive, FileType, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToolTheme } from '@/context/ToolThemeContext';
import { useConversionStats } from '@/lib/useConversionStats';
import { formatFileSize } from '@/lib/conversionFormats';

const UTILITIES_BASE = [
  {
    path: '/file-converter',
    icon: RefreshCw,
    label: 'File Converter',
    tagline: 'Convert anything. Instantly.',
    description:
      'Transform video, audio, image, and document files between dozens of formats — all directly in your browser. Powered by FFmpeg WASM with native multi-threading. Batch-convert entire queues, apply compression, trim clips, and export GIFs without ever touching a server.',
    features: ['50+ formats', 'GPU-accelerated', 'Batch mode', 'Zero uploads'],
  },
  {
    path: '/image-editor',
    icon: Wand2,
    label: 'Image Editor',
    tagline: 'Edit like a pro.',
    description:
      'A fully non-destructive image editor that lives in your tab. Ten Lightroom-style sliders cover Exposure, Contrast, Highlights, Shadows, Whites, Blacks, Saturation, Vibrance, Temperature, and Tint. MS-Paint-style pen, brush, and eraser tools let you draw on top of the image. Rotate, flip, zoom, crop with rule-of-thirds, and ten preset filters round out the toolbox. Every edit runs through the browser Canvas — nothing ever leaves your device.',
    features: ['Lightroom sliders', 'Pen + Brush + Eraser', 'Interactive crop', '100% private'],
  },
  {
    path: '/audio-modifier',
    icon: Music,
    label: 'Audio Modifier',
    tagline: 'Shape your sound.',
    description:
      'A full-featured audio workstation running entirely in your browser. Drag and drop any audio file to trim, EQ with cubic spline curves, add 3D spatial effects, reverb, bass boost, pitch shift, reverse, pan, and adjust tempo or volume. All processing happens via the Web Audio API — zero uploads, zero servers.',
    features: ['10 audio tools', 'Live waveform', 'EQ spline editor', 'WAV export'],
  },
  {
    path: '/content-previewer',
    icon: Eye,
    label: 'Content Previewer',
    tagline: 'Preview before you post.',
    description:
      'Drop any video to instantly check safe-zone overlays for TikTok, Instagram Reels, YouTube Shorts, and Twitter. Preview how your content looks in realistic social media UI mocks, and capture custom thumbnails at any frame with the built-in scrubber. Everything runs entirely in-browser.',
    features: ['Safe-zone overlays', 'Social UI mocks', 'Thumbnail builder', '5 platforms'],
  },
];

function Pill({ icon: Icon, label }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium glass-card border border-border/40 text-muted-foreground">
      <Icon className="w-3 h-3 text-primary" />
      {label}
    </span>
  );
}

function GradientBlob({ className }) {
  return (
    <div
      className={`absolute rounded-full blur-3xl pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
}

function UtilityCard({ util, index }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const navigate = useNavigate();
  const Icon = util.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 48 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="group relative glass-card rounded-2xl border border-border/40 overflow-hidden"
      style={{ boxShadow: `0 0 60px ${util.glow}` }}
    >
      <div className={`h-1 w-full bg-gradient-to-r ${util.color}`} />

      <div className="p-5 sm:p-8 md:p-10">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-xl bg-gradient-to-br ${util.color} flex items-center justify-center shadow-lg`}
            >
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-display font-bold text-foreground">{util.label}</h3>
              <p className="text-sm text-muted-foreground mt-0.5">{util.tagline}</p>
            </div>
          </div>
          <button
            onClick={() => navigate(util.path)}
            className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r ${util.color} text-white opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0 hover:shadow-lg whitespace-nowrap`}
          >
            Open tool <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground mb-6">
          {util.description}
        </p>

        <button
          onClick={() => navigate(util.path)}
          className={`md:hidden w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r ${util.color} text-white`}
        >
          Open tool <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

const CATEGORY_LABELS = {
  video: 'Video',
  audio: 'Audio',
  image: 'Image',
  document: 'Document',
  svg: 'SVG',
};

function StatTile({ icon: Icon, label, value, sub, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className="glass-card rounded-2xl border border-border/40 p-4 sm:p-5 relative overflow-hidden"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground/60">
          {label}
        </span>
        <Icon className="w-3.5 h-3.5 text-primary/70 flex-shrink-0" />
      </div>
      <p className="text-2xl sm:text-3xl font-display font-bold text-foreground leading-none tabular-nums truncate">
        {value}
      </p>
      {sub && (
        <p className="text-[11px] text-muted-foreground/60 mt-2 leading-snug truncate">
          {sub}
        </p>
      )}
    </motion.div>
  );
}

function Sparkline({ data }) {
  const max = Math.max(1, ...data);
  const width = 280;
  const height = 56;
  const gap = 4;
  const barWidth = (width - gap * (data.length - 1)) / data.length;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="w-full h-14"
      aria-label="Conversions per day over the last 14 days"
    >
      <defs>
        <linearGradient id="sparkline-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="hsl(262,83%,58%)" />
          <stop offset="100%" stopColor="hsl(187,92%,50%)" />
        </linearGradient>
      </defs>
      {data.map((v, i) => {
        const h = v === 0 ? 2 : Math.max(2, (v / max) * (height - 4));
        const x = i * (barWidth + gap);
        const y = height - h;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barWidth}
            height={h}
            rx={1.5}
            fill="url(#sparkline-grad)"
            opacity={v === 0 ? 0.18 : 0.9}
          />
        );
      })}
    </svg>
  );
}

function ActivitySection() {
  const stats = useConversionStats();
  if (!stats) return null;

  const headlineCount = stats.total.toLocaleString();
  const topCategoryLabel = stats.topCategory ? (CATEGORY_LABELS[stats.topCategory] || stats.topCategory) : '—';
  const topFormatLabel = stats.topFormat || '—';
  const weekActive = stats.daily.filter(n => n > 0).length;

  return (
    <section className="relative px-4 pb-20 pt-4">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-primary/70 mb-3">
            Your activity
          </p>
          <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
            <span className="gradient-text tabular-nums">{headlineCount}</span>{' '}
            <span>conversion{stats.total === 1 ? '' : 's'}, and counting.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
          <StatTile
            icon={Activity}
            label="All-time"
            value={stats.total.toLocaleString()}
            sub={`${stats.weekTotal} this week`}
            delay={0.02}
          />
          <StatTile
            icon={HardDrive}
            label="Data processed"
            value={formatFileSize(stats.totalBytes)}
            sub="across all conversions"
            delay={0.08}
          />
          <StatTile
            icon={FileType}
            label="Top format"
            value={topFormatLabel}
            sub="most-used target"
            delay={0.14}
          />
          <StatTile
            icon={Layers}
            label="Top category"
            value={topCategoryLabel}
            sub="where you spend time"
            delay={0.2}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, delay: 0.26 }}
          className="glass-card rounded-2xl border border-border/40 p-4 sm:p-5"
        >
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-3.5 h-3.5 text-primary/70" />
              <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground/60">
                Last 14 days
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground/60 tabular-nums">
              active on {weekActive} of 14 days
            </span>
          </div>
          <Sparkline data={stats.daily} />
        </motion.div>
      </div>
    </section>
  );
}

export default function Home() {
  const portfolioRef = useRef(null);
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const { getToolGradient } = useToolTheme();

  // Build utilities with dynamic gradients from ToolThemeContext
  const UTILITIES = UTILITIES_BASE.map(u => {
    const gradient = getToolGradient(u.path);
    return { ...u, color: gradient.color, glow: gradient.glow };
  });

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToPortfolio = () => {
    portfolioRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative overflow-x-hidden">
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center px-4 text-center overflow-hidden">
        <GradientBlob className="w-[600px] h-[600px] bg-violet-600/20 -top-32 -left-48" />
        <GradientBlob className="w-[500px] h-[500px] bg-cyan-500/15 top-1/3 -right-40" />
        <GradientBlob className="w-[400px] h-[400px] bg-pink-600/10 bottom-0 left-1/3" />

        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div
          className="relative z-10 flex flex-col items-center max-w-5xl mx-auto"
          style={{ transform: `translateY(${scrollY * 0.2}px)` }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase glass-card border border-primary/30 text-primary">
              <Zap className="w-3 h-3" />
              Browser-native · Zero uploads · Open source
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="font-display font-black leading-[1.05] tracking-tight mb-6"
            style={{ fontSize: 'clamp(3rem, 9vw, 7rem)' }}
          >
            <span className="gradient-text">The Ultimate Tech</span>
            <br />
            <span className="text-foreground">Utility Hub.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.22 }}
            className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed mb-10"
          >
            All your tools, all local, all private — no account required, no server dependency, no compromise.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.34 }}
            className="flex flex-wrap justify-center gap-2 mb-12"
          >
            <Pill icon={Shield} label="100% Private" />
            <Pill icon={Cpu} label="Hardware-Powered" />
            <Pill icon={Zap} label="No File Limits" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.44 }}
            className="flex justify-center"
          >
            <Button
              size="lg"
              className="h-12 px-8 text-base font-semibold gap-2"
              onClick={scrollToPortfolio}
            >
              Explore tools <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          onClick={scrollToPortfolio}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          aria-label="Scroll to tools"
        >
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <div className="w-px h-10 bg-gradient-to-b from-muted-foreground/30 to-transparent animate-pulse" />
        </motion.button>
      </section>

      <ActivitySection />

      <section ref={portfolioRef} className="relative px-4 pb-24 pt-8">
        <div className="max-w-5xl mx-auto mb-12 text-center">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-xs font-semibold tracking-[0.25em] uppercase text-primary/70 mb-3"
          >
            Utilities
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-4xl font-display font-bold text-foreground"
          >
            Your complete utility suite,{' '}
            <span className="gradient-text">entirely in-browser.</span>
          </motion.h2>
        </div>

        <div className="max-w-5xl mx-auto grid grid-cols-1 gap-6">
          {UTILITIES.map((util, i) => (
            <UtilityCard key={util.path} util={util} index={i} />
          ))}
        </div>
      </section>

      <section className="relative px-4 pb-24">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative rounded-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(250,204,21,0.06) 0%, rgba(146,64,14,0.04) 100%)',
              border: '1px solid rgba(250,204,21,0.2)',
              boxShadow: '0 0 60px rgba(250,204,21,0.06)',
            }}
          >
            {/* Amber glow blobs */}
            <div aria-hidden className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-25"
              style={{ background: '#FACC15' }} />
            <div aria-hidden className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full blur-3xl opacity-15"
              style={{ background: '#F97316' }} />

            <div className="relative z-10 h-px w-full"
              style={{ background: 'linear-gradient(90deg, #FACC15, #92400E 60%, transparent)' }} />

            <div className="relative z-10 p-8 md:p-12">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                  <p className="text-xs font-semibold tracking-[0.25em] uppercase mb-2"
                    style={{ color: 'rgba(250,204,21,0.7)' }}>
                    Also built into SparkUtilities
                  </p>
                  <h2 className="text-3xl md:text-4xl font-display font-black tracking-tight leading-tight">
                    <span className="bg-clip-text text-transparent"
                      style={{ backgroundImage: 'linear-gradient(135deg, #FACC15 0%, #78350F 80%)' }}>
                      Flux
                    </span>
                    <span className="text-foreground">Kit</span>
                    <span className="text-muted-foreground font-normal text-2xl md:text-3xl ml-3">
                      — Developer Toolkit
                    </span>
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground max-w-lg">
                    21 browser-native developer utilities across 5 categories — Data &amp; Structure, Web Dev Assets, Security &amp; Logic, Productivity, and LaTeX Builder. No uploads, no accounts, no waiting.
                  </p>
                </div>
                <button
                  onClick={() => { window.scrollTo({ top: 0, behavior: 'instant' }); navigate('/fluxkit'); }}
                  className="flex-shrink-0 flex items-center gap-2 h-11 px-7 rounded-xl text-sm font-semibold text-black transition-all hover:shadow-lg hover:shadow-yellow-500/20 hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, #FACC15, #F97316)' }}
                >
                  Explore FluxKit <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { icon: Database,    label: 'Data & Structure',   desc: 'JSON · XML · CSV · YAML · SQL',        path: '/fluxkit/data-structure'  },
                  { icon: Palette,     label: 'Web Dev Assets',     desc: 'CSS · SVG · Flexbox · Grid',           path: '/fluxkit/web-dev-assets'  },
                  { icon: ShieldCheck, label: 'Security & Logic',   desc: 'JWT · Regex · Cron · Bcrypt',          path: '/fluxkit/security-logic'  },
                  { icon: Wrench,      label: 'Productivity Tools', desc: 'Diff · Console · cURL · Markdown',     path: '/fluxkit/productivity'    },
                ].map(({ icon: Icon, label, desc, path }, i) => (
                  <motion.button
                    key={path}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                    onClick={() => { window.scrollTo({ top: 0, behavior: 'instant' }); navigate(path); }}
                    className="group text-left rounded-xl p-4 transition-all hover:scale-[1.02]"
                    style={{
                      background: 'rgba(250,204,21,0.04)',
                      border: '1px solid rgba(250,204,21,0.15)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(250,204,21,0.09)'; e.currentTarget.style.borderColor = 'rgba(250,204,21,0.3)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(250,204,21,0.04)'; e.currentTarget.style.borderColor = 'rgba(250,204,21,0.15)'; }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                      style={{ background: 'rgba(250,204,21,0.12)', border: '1px solid rgba(250,204,21,0.2)' }}>
                      <Icon className="w-4 h-4" style={{ color: '#FACC15' }} />
                    </div>
                    <p className="text-sm font-semibold text-foreground leading-none mb-1">{label}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{desc}</p>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
