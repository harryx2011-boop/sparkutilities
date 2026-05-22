import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video, Trash2, Download, Play, Pause,
  Shield, Eye, EyeOff, Check, Share2, Camera, Keyboard,
  Link2, Globe, AlertTriangle, Loader2, X,
} from 'lucide-react';
import { useToolTheme } from '@/context/ToolThemeContext';
import { useSettings } from '@/context/SettingsContext';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';

// ─── URL Preview helpers ─────────────────────────────────────────────────────
const URL_PREVIEW_HISTORY_KEY = 'sparkutility_url_preview_history';
const URL_PREVIEW_HISTORY_MAX = 5;

function isValidHttpUrl(s) {
  if (typeof s !== 'string') return false;
  if (!/^https?:\/\//i.test(s)) return false;
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch { return false; }
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(URL_PREVIEW_HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter(isValidHttpUrl).slice(0, URL_PREVIEW_HISTORY_MAX) : [];
  } catch { return []; }
}

function saveHistory(list) {
  try {
    localStorage.setItem(URL_PREVIEW_HISTORY_KEY, JSON.stringify(list.slice(0, URL_PREVIEW_HISTORY_MAX)));
  } catch {}
}

// ─── Preview card variants ───────────────────────────────────────────────────
function TwitterPreviewCard({ data }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-border/60 bg-card max-w-md">
      {data.image && (
        <div className="bg-black" style={{ aspectRatio: '1.91/1' }}>
          <img src={data.image} alt="" loading="lazy" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        </div>
      )}
      <div className="p-3 space-y-1">
        {data.siteName && (
          <p className="text-xs text-muted-foreground uppercase tracking-wide truncate">{data.siteName}</p>
        )}
        {data.title && <p className="text-sm font-semibold leading-snug line-clamp-2">{data.title}</p>}
        {data.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{data.description}</p>
        )}
        <div className="flex items-center gap-1.5 pt-1">
          {data.favicon && <img src={data.favicon} alt="" className="w-3 h-3 rounded-sm" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
          <span className="text-[11px] text-muted-foreground truncate">{new URL(data.url).hostname.replace(/^www\./, '')}</span>
        </div>
      </div>
    </div>
  );
}

function DiscordPreviewCard({ data }) {
  return (
    <div className="rounded-md bg-[#2b2d31] text-white max-w-md flex border-l-4 border-l-[#5865f2]">
      <div className="flex-1 min-w-0 p-3 space-y-1">
        {data.siteName && <p className="text-xs text-neutral-400 truncate">{data.siteName}</p>}
        {data.title && (
          <p className="text-sm font-semibold text-[#00a8fc] hover:underline cursor-pointer line-clamp-2 leading-snug">
            {data.title}
          </p>
        )}
        {data.description && (
          <p className="text-xs text-neutral-300 line-clamp-3 leading-relaxed">{data.description}</p>
        )}
      </div>
      {data.image && (
        <div className="w-20 h-20 flex-shrink-0 m-3 rounded overflow-hidden bg-black">
          <img src={data.image} alt="" loading="lazy" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        </div>
      )}
    </div>
  );
}

function IMessagePreviewCard({ data }) {
  return (
    <div className="rounded-2xl overflow-hidden bg-[#1c1c1e] text-white max-w-md border border-white/5">
      {data.image ? (
        <div className="relative bg-black" style={{ aspectRatio: '16/9' }}>
          <img src={data.image} alt="" loading="lazy" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/85 via-black/40 to-transparent">
            {data.title && <p className="text-sm font-semibold line-clamp-2 leading-snug">{data.title}</p>}
            <div className="flex items-center gap-1.5 mt-1">
              {data.favicon && <img src={data.favicon} alt="" className="w-3 h-3 rounded-sm" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
              <span className="text-[11px] text-neutral-300 truncate">{new URL(data.url).hostname.replace(/^www\./, '')}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 space-y-1">
          {data.title && <p className="text-sm font-semibold line-clamp-2">{data.title}</p>}
          {data.description && <p className="text-xs text-neutral-300 line-clamp-3">{data.description}</p>}
          <span className="text-[11px] text-neutral-400">{new URL(data.url).hostname.replace(/^www\./, '')}</span>
        </div>
      )}
    </div>
  );
}

// ─── Platform safe-zone definitions ──────────────────────────────────────────
// All values as percentages of the video frame
const SAFE_ZONES = {
  tiktok: {
    label: 'TikTok',
    color: '#fe2c55',
    zones: [
      { label: 'Bottom UI (likes/comments)', top: 72, left: 0, width: 100, height: 28, opacity: 0.35 },
      { label: 'Left safe area', top: 0, left: 0, width: 10, height: 100, opacity: 0.15 },
      { label: 'Right safe area', top: 0, left: 90, width: 10, height: 100, opacity: 0.15 },
      { label: 'Top bar', top: 0, left: 0, width: 100, height: 8, opacity: 0.2 },
    ],
    ratio: '9:16',
    width: 1080,
    height: 1920,
  },
  instagram_reels: {
    label: 'Instagram Reels',
    color: '#c13584',
    zones: [
      { label: 'Bottom UI', top: 75, left: 0, width: 100, height: 25, opacity: 0.35 },
      { label: 'Left margin', top: 0, left: 0, width: 8, height: 100, opacity: 0.15 },
      { label: 'Right margin', top: 0, left: 92, width: 8, height: 100, opacity: 0.15 },
      { label: 'Top bar', top: 0, left: 0, width: 100, height: 6, opacity: 0.2 },
    ],
    ratio: '9:16',
    width: 1080,
    height: 1920,
  },
  instagram_post: {
    label: 'Instagram Post',
    color: '#e1306c',
    zones: [
      { label: 'Caption area (below)', top: 88, left: 0, width: 100, height: 12, opacity: 0.3 },
    ],
    ratio: '1:1',
    width: 1080,
    height: 1080,
  },
  youtube_short: {
    label: 'YouTube Shorts',
    color: '#ff0000',
    zones: [
      { label: 'Bottom controls', top: 78, left: 0, width: 100, height: 22, opacity: 0.35 },
      { label: 'Top bar', top: 0, left: 0, width: 100, height: 7, opacity: 0.2 },
      { label: 'Right shelf', top: 30, left: 84, width: 16, height: 45, opacity: 0.3 },
    ],
    ratio: '9:16',
    width: 1080,
    height: 1920,
  },
  twitter: {
    label: 'X / Twitter',
    color: '#1da1f2',
    zones: [
      { label: 'Side margins', top: 0, left: 0, width: 5, height: 100, opacity: 0.15 },
      { label: 'Side margins', top: 0, left: 95, width: 5, height: 100, opacity: 0.15 },
    ],
    ratio: '16:9',
    width: 1280,
    height: 720,
  },
};

// ─── Social preview mock UIs ──────────────────────────────────────────────────
function TikTokMock({ videoSrc, thumbnail, playing, onToggle }) {
  return (
    <div className="relative rounded-2xl overflow-hidden bg-black select-none" style={{ width: 220, height: 390, flexShrink: 0 }}>
      {thumbnail ? (
        <img src={thumbnail} alt="preview" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center">
          <Video className="w-8 h-8 text-neutral-600" />
        </div>
      )}
      {/* Overlay UI */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
      {/* Top bar */}
      <div className="absolute top-3 left-0 right-0 flex items-center justify-center gap-6 text-white text-xs font-semibold">
        <span className="opacity-60">Following</span>
        <span className="border-b-2 border-white pb-0.5">For You</span>
      </div>
      {/* Right actions */}
      <div className="absolute right-2 bottom-24 flex flex-col items-center gap-4">
        <div className="w-8 h-8 rounded-full bg-neutral-700 border-2 border-white overflow-hidden flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-primary" />
        </div>
        {['♥', '💬', '↗', '♫'].map((icon, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <span className="text-lg">{icon}</span>
            <span className="text-white text-[9px]">{['24.5K', '1.2K', '891', ''][i]}</span>
          </div>
        ))}
      </div>
      {/* Bottom text */}
      <div className="absolute bottom-3 left-3 right-12 text-white">
        <p className="text-xs font-bold mb-0.5">@yourusername</p>
        <p className="text-[10px] opacity-80 line-clamp-2">Your caption goes here #fyp #trending</p>
        <div className="flex items-center gap-1 mt-1">
          <span className="text-[10px]">♫</span>
          <span className="text-[10px] opacity-70">Original audio - username</span>
        </div>
      </div>
      {/* Bottom nav */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-around items-center py-2 bg-black/40 border-t border-white/10">
        {['🏠', '🔍', '+', '📥', '👤'].map((icon, i) => (
          <span key={i} className={`text-base ${i === 2 ? 'bg-white text-black rounded-md px-2 py-0.5 text-xs font-bold' : ''}`}>{icon}</span>
        ))}
      </div>
      <div className="absolute top-1 left-1 bg-[#fe2c55] text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">TikTok</div>
    </div>
  );
}

function InstagramMock({ thumbnail, isReel }) {
  return (
    <div className="rounded-2xl overflow-hidden bg-neutral-950 border border-neutral-800 select-none" style={{ width: 220, flexShrink: 0 }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-neutral-800">
        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-yellow-400 to-pink-600" />
        <span className="text-white text-xs font-semibold">yourusername</span>
        <span className="ml-auto text-neutral-500 text-xs">···</span>
      </div>
      {/* Media */}
      <div className="relative bg-neutral-900" style={{ aspectRatio: isReel ? '9/16' : '1/1', maxHeight: isReel ? 280 : 220 }}>
        {thumbnail ? (
          <img src={thumbnail} alt="preview" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Video className="w-8 h-8 text-neutral-700" />
          </div>
        )}
        {isReel && <div className="absolute top-2 right-2 text-white text-[10px] font-bold bg-black/50 px-1.5 py-0.5 rounded">▶ Reel</div>}
      </div>
      {/* Actions */}
      <div className="px-3 py-2 space-y-1">
        <div className="flex gap-3 text-white text-base">
          <span>♥</span><span>💬</span><span>↗</span>
          <span className="ml-auto">🔖</span>
        </div>
        <p className="text-white text-[10px] font-semibold">1,234 likes</p>
        <p className="text-white text-[10px]"><span className="font-semibold">yourusername</span> Caption text…</p>
      </div>
      <div className="absolute top-1 left-1 bg-[#c13584] text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full relative mx-3 mb-2 inline-block">Instagram</div>
    </div>
  );
}

function TwitterMock({ thumbnail }) {
  return (
    <div className="rounded-2xl overflow-hidden bg-black border border-neutral-800 select-none" style={{ width: 280, flexShrink: 0 }}>
      <div className="flex gap-2 p-3">
        <div className="w-8 h-8 rounded-full bg-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-white text-xs font-bold">Display Name</span>
            <span className="text-neutral-500 text-xs">@handle · 2m</span>
          </div>
          <p className="text-white text-xs mb-2">Your video post caption here</p>
          <div className="rounded-xl overflow-hidden bg-neutral-900" style={{ aspectRatio: '16/9' }}>
            {thumbnail ? (
              <img src={thumbnail} alt="preview" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center py-6">
                <Video className="w-6 h-6 text-neutral-700" />
              </div>
            )}
          </div>
          <div className="flex gap-4 mt-2 text-neutral-500 text-xs">
            <span>💬 12</span><span>🔁 34</span><span>♥ 567</span>
          </div>
        </div>
      </div>
      <div className="bg-[#1da1f2] text-white text-[8px] font-bold px-2 py-0.5 mx-3 mb-2 rounded-full inline-block">X / Twitter</div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ContentPreviewer() {
  const { getToolGradient } = useToolTheme();
  const toolGradient = getToolGradient('/content-previewer');

  const [mode, setMode] = useState('video'); // 'video' | 'url'
  const [file, setFile] = useState(null);
  const [videoSrc, setVideoSrc] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [activeZone, setActiveZone] = useState('tiktok');
  const [showZones, setShowZones] = useState(true);
  const [activeTab, setActiveTab] = useState('safezone'); // safezone | social | thumbnail
  const [thumbTime, setThumbTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [thumbCaptured, setThumbCaptured] = useState(false);

  // ─── URL preview state ─────────────────────────────────────────────────────
  const [urlInput, setUrlInput] = useState('');
  const [urlPreviewData, setUrlPreviewData] = useState(null);
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState(null);
  const [urlHistory, setUrlHistory] = useState([]);
  const urlInputRef = useRef(null);

  useEffect(() => { setUrlHistory(loadHistory()); }, []);
  useEffect(() => {
    if (mode === 'url') {
      // Defer focus so the input is mounted.
      requestAnimationFrame(() => urlInputRef.current?.focus());
    }
  }, [mode]);

  const runUrlPreview = useCallback(async (rawUrl) => {
    const target = (rawUrl ?? urlInput).trim();
    if (!isValidHttpUrl(target)) {
      setUrlError('Enter a full URL starting with http:// or https://');
      setUrlPreviewData(null);
      return;
    }
    setUrlError(null);
    setUrlLoading(true);
    setUrlPreviewData(null);
    try {
      const res = await fetch(`/api/preview?url=${encodeURIComponent(target)}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Request failed (${res.status})`);
      setUrlPreviewData(json);
      setUrlInput(json.url || target);
      setUrlHistory(prev => {
        const next = [json.url || target, ...prev.filter(u => u !== (json.url || target))].slice(0, URL_PREVIEW_HISTORY_MAX);
        saveHistory(next);
        return next;
      });
    } catch (err) {
      setUrlError(err?.message || 'Preview failed');
    } finally {
      setUrlLoading(false);
    }
  }, [urlInput]);

  const clearUrlHistory = useCallback(() => {
    setUrlHistory([]);
    try { localStorage.removeItem(URL_PREVIEW_HISTORY_KEY); } catch {}
  }, []);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const dropRef = useRef(null);

  const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo', 'video/mpeg'];

  const loadFile = useCallback((f) => {
    const isVideo = VIDEO_TYPES.includes(f.type) || /\.(mp4|webm|ogg|mov|avi|mkv|m4v)$/i.test(f.name);
    if (!isVideo) return;
    if (videoSrc) URL.revokeObjectURL(videoSrc);
    const url = URL.createObjectURL(f);
    setFile(f);
    setVideoSrc(url);
    setThumbnail(null);
    setPlaying(false);
    setThumbTime(0);
  }, [videoSrc]);

  // Cleanup object URL on unmount
  useEffect(() => () => { if (videoSrc) URL.revokeObjectURL(videoSrc); }, []);

  const captureThumb = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const url = canvas.toDataURL('image/jpeg', 0.9);
    setThumbnail(url);
    setThumbCaptured(true);
    setTimeout(() => setThumbCaptured(false), 2000);
  }, []);

  const downloadThumb = useCallback(() => {
    if (!thumbnail) return;
    const a = document.createElement('a');
    a.href = thumbnail;
    a.download = (file?.name?.replace(/\.[^.]+$/, '') || 'thumbnail') + '_thumb.jpg';
    a.click();
  }, [thumbnail, file]);

  const handleSeek = useCallback((e) => {
    const t = Number(e.target.value);
    setThumbTime(t);
    if (videoRef.current) videoRef.current.currentTime = t;
  }, []);

  const onDrop = (e) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) loadFile(f);
  };

  // Space to toggle play/pause on the loaded preview video. Mirrors the
  // Audio Modifier convention; user-remappable via Settings → Keybinds.
  const { settings } = useSettings();
  useKeyboardShortcuts({
    [settings?.keybinds?.previewerPlayPause ?? 'Space']: () => {
      const v = videoRef.current; if (!v) return;
      if (v.paused) v.play().catch(() => {}); else v.pause();
    },
  }, { enabled: !!videoSrc });

  const zone = SAFE_ZONES[activeZone];

  // Aspect ratio container
  const frameAspect = zone.ratio === '9:16' ? '9/16' : zone.ratio === '1:1' ? '1/1' : '16/9';

  const TABS = [
    { id: 'safezone', label: 'Safe Zones', icon: Shield },
    { id: 'social', label: 'Social Previews', icon: Share2 },
    { id: 'thumbnail', label: 'Thumbnail Builder', icon: Camera },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      {/* Hero */}
      <section className="relative py-14 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-20"
            style={{ background: `radial-gradient(circle, ${toolGradient.preview[0]}, transparent)` }} />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl opacity-15"
            style={{ background: `radial-gradient(circle, ${toolGradient.preview[1]}, transparent)` }} />
        </div>
        <div className="relative max-w-4xl mx-auto text-center px-4">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase mb-6 shadow-lg"
            style={{ background: `linear-gradient(135deg, ${toolGradient.preview[0]}, ${toolGradient.preview[1]})`, color: '#fff' }}>
            <Eye className="w-3.5 h-3.5" /> Content Previewer
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold tracking-tight leading-tight mb-4">
            Preview before you{' '}
            <span className="bg-clip-text text-transparent"
              style={{ backgroundImage: `linear-gradient(135deg, ${toolGradient.preview[0]}, ${toolGradient.preview[1]})` }}>
              post.
            </span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-8">
            Drop any video to check safe-zone overlays for TikTok and Instagram,
            preview how it looks on social platforms, and capture custom thumbnails.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
            className="flex flex-wrap justify-center gap-3">
            {[{ icon: Shield, label: 'Safe-Zone Overlays' }, { icon: Share2, label: 'Social Previews' }, { icon: Camera, label: 'Thumbnail Builder' }].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 px-4 py-2 rounded-full glass-card text-sm font-medium text-foreground/80">
                <Icon className="w-4 h-4 text-primary" /> {label}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Mode toggle */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
        className="glass-card rounded-2xl p-1 flex gap-1 mb-5 max-w-md mx-auto relative">
        {[
          { id: 'video', label: 'Video Preview', icon: Video },
          { id: 'url',   label: 'URL Preview',   icon: Link2 },
        ].map(({ id, label, icon: Icon }) => {
          const active = mode === id;
          return (
            <button key={id} onClick={() => setMode(id)}
              className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              {active && (
                <motion.span layoutId="cp-mode-indicator"
                  className="absolute inset-0 rounded-xl bg-primary/15"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }} />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <Icon className="w-4 h-4" /> {label}
              </span>
            </button>
          );
        })}
      </motion.div>

      {mode === 'url' && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-5">
          {/* Input card */}
          <div className="glass-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <Globe className="w-4 h-4 text-primary" />
              <p className="font-semibold">Preview how any link unfurls</p>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              See exactly how your URL appears on Twitter, Discord, and iMessage before you share it.
            </p>

            {urlHistory.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">Recent</span>
                {urlHistory.map((u) => {
                  let host = u;
                  try { host = new URL(u).hostname.replace(/^www\./, ''); } catch {}
                  return (
                    <button key={u} onClick={() => { setUrlInput(u); runUrlPreview(u); }}
                      className="text-xs px-2.5 py-1 rounded-full glass-card border border-border/40 hover:border-primary/40 hover:text-primary transition-colors max-w-[180px] truncate"
                      title={u}>
                      {host}
                    </button>
                  );
                })}
                <button onClick={clearUrlHistory}
                  className="text-[10px] text-muted-foreground/60 hover:text-destructive transition-colors ml-1"
                  aria-label="Clear preview history">
                  Clear
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  ref={urlInputRef}
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') runUrlPreview(); }}
                  placeholder="https://example.com/article"
                  spellCheck={false}
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-secondary/50 border border-border/60 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all" />
                {urlInput && (
                  <button onClick={() => { setUrlInput(''); setUrlPreviewData(null); setUrlError(null); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-secondary text-muted-foreground"
                    aria-label="Clear URL">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button onClick={() => runUrlPreview()} disabled={urlLoading || !urlInput.trim()}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                style={{ background: `linear-gradient(135deg, ${toolGradient.preview[0]}, ${toolGradient.preview[1]})` }}>
                {urlLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Fetching</> : <><Eye className="w-4 h-4" /> Preview</>}
              </button>
            </div>

            {urlError && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-destructive/10 border border-destructive/30">
                <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-xs text-destructive leading-relaxed">{urlError}</p>
              </div>
            )}
          </div>

          {/* Preview variants */}
          <AnimatePresence mode="wait">
            {urlPreviewData && (
              <motion.div key={urlPreviewData.url}
                initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: 'Twitter / X',  accent: '#1d9bf0', Card: TwitterPreviewCard },
                  { label: 'Discord',      accent: '#5865f2', Card: DiscordPreviewCard },
                  { label: 'iMessage',     accent: '#34c759', Card: IMessagePreviewCard },
                ].map(({ label, accent, Card }, i) => (
                  <motion.div key={label}
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                    className="glass-card rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: accent }} />
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                    </div>
                    <div className="flex justify-center">
                      <Card data={urlPreviewData} />
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {!urlPreviewData && !urlLoading && !urlError && (
            <div className="glass-card rounded-2xl p-8 text-center">
              <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-3"
                style={{ background: `linear-gradient(135deg, ${toolGradient.preview[0]}33, ${toolGradient.preview[1]}33)` }}>
                <Link2 className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-semibold mb-1">Drop in a link to see how it unfurls.</p>
              <p className="text-xs text-muted-foreground">Three platform-accurate previews, side by side.</p>
            </div>
          )}
        </motion.div>
      )}

      {mode === 'video' && !file ? (
        // Drop zone
        <motion.label initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          onDrop={onDrop}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          className="block cursor-pointer">
          <div className={`glass-card rounded-2xl border-2 border-dashed transition-all duration-300 p-16 text-center ${isDragging ? 'border-primary/60 bg-primary/5 scale-[1.01]' : 'border-border/60 hover:border-primary/40'}`}>
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${toolGradient.color} flex items-center justify-center mx-auto mb-4 shadow-lg ${isDragging ? 'scale-110' : ''} transition-transform`}
              style={{ boxShadow: `0 0 30px ${toolGradient.glow}` }}>
              <Video className="w-8 h-8 text-white" />
            </div>
            <p className="text-lg font-semibold mb-1">{isDragging ? 'Drop it!' : 'Drop your video here'}</p>
            <p className="text-sm text-muted-foreground mb-4">or click to browse your files</p>
            <p className="text-xs text-muted-foreground/60 mb-5">MP4, WebM, MOV, AVI, MKV, OGG supported · processed locally · never uploaded</p>
            <div className="flex flex-wrap justify-center gap-2 text-[11px] text-muted-foreground/80">
              {[
                { icon: Shield,  label: 'Safe-zone overlays for 5 platforms' },
                { icon: Camera,  label: 'Frame-by-frame thumbnail capture' },
                { icon: Share2,  label: 'TikTok / Reels / Twitter mockups' },
              ].map(({ icon: Icon, label }) => (
                <span key={label} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary/50 border border-border/40">
                  <Icon className="w-3 h-3 text-primary/80" /> {label}
                </span>
              ))}
            </div>
          </div>
          <input type="file" accept="video/*" className="hidden" onChange={e => { const f = e.target.files[0]; if (f) loadFile(f); }} />
        </motion.label>
      ) : mode === 'video' && file ? (
        <div className="space-y-5">
          {/* File bar */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${toolGradient.color} flex items-center justify-center flex-shrink-0`}>
                <Video className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{file.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                  {duration > 0 && (
                    <>
                      <span className="opacity-50">·</span>
                      <span className="font-mono">{Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}</span>
                    </>
                  )}
                  <span className="opacity-50 hidden sm:inline">·</span>
                  <span className="hidden sm:inline-flex items-center gap-1 opacity-80">
                    <Keyboard className="w-3 h-3" />
                    <kbd className="px-1 rounded bg-secondary border border-border/50 font-mono text-[10px]">Space</kbd>
                    <span className="text-[11px]">play / pause</span>
                  </span>
                </div>
              </div>
            </div>
            <button onClick={() => { setFile(null); if (videoSrc) URL.revokeObjectURL(videoSrc); setVideoSrc(null); setThumbnail(null); }}
              className="p-2 rounded-lg hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
              aria-label="Remove file and start over">
              <Trash2 className="w-4 h-4" />
            </button>
          </motion.div>

          {/* Tab bar */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
            className="glass-card rounded-2xl p-1 flex gap-1 relative">
            {TABS.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;
              return (
                <button key={id} onClick={() => setActiveTab(id)}
                  className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                  {isActive && (
                    <motion.span layoutId="previewer-tab-indicator"
                      className="absolute inset-0 rounded-xl bg-primary/15"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }} />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{label}</span>
                  </span>
                </button>
              );
            })}
          </motion.div>

          {/* Safe Zone tab */}
          {activeTab === 'safezone' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {/* Platform selector */}
              <div className="glass-card rounded-2xl p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Platform</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(SAFE_ZONES).map(([key, z]) => (
                    <button key={key} onClick={() => setActiveZone(key)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${activeZone === key ? 'text-white' : 'glass-card text-muted-foreground hover:text-foreground'}`}
                      style={activeZone === key ? { background: z.color } : {}}>
                      {z.label}
                      <span className="ml-1.5 opacity-60 font-mono text-[9px]">{z.ratio}</span>
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <button onClick={() => setShowZones(v => !v)}
                    aria-pressed={showZones}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg transition-colors ${showZones ? 'bg-primary/15 text-primary border border-primary/30' : 'glass-card text-muted-foreground border border-transparent'}`}>
                    {showZones ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {showZones ? 'Overlays ON' : 'Overlays OFF'}
                  </button>
                  <span className="text-xs text-muted-foreground">
                    Viewing: <span style={{ color: zone.color }} className="font-semibold">{zone.label}</span>
                    <span className="ml-2 opacity-60 font-mono">{zone.width}×{zone.height}</span>
                  </span>
                </div>
              </div>

              {/* Video + overlays */}
              <div className="flex justify-center">
                <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl"
                  style={{ aspectRatio: frameAspect, maxHeight: '70vh', maxWidth: frameAspect === '9/16' ? 340 : '100%', width: '100%' }}>
                  <video ref={videoRef} src={videoSrc} className="w-full h-full object-contain"
                    onLoadedMetadata={e => setDuration(e.target.duration)}
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                    loop playsInline />

                  {/* Safe zone overlays */}
                  {showZones && zone.zones.map((z, i) => (
                    <div key={i} className="absolute pointer-events-none"
                      style={{
                        top: `${z.top}%`, left: `${z.left}%`,
                        width: `${z.width}%`, height: `${z.height}%`,
                        background: zone.color,
                        opacity: z.opacity,
                        borderTop: i === 0 ? `2px dashed ${zone.color}` : 'none',
                      }} />
                  ))}

                  {/* Zone labels */}
                  {showZones && (
                    <div className="absolute top-2 left-2">
                      <div className="text-[10px] font-bold px-2 py-1 rounded-lg text-white"
                        style={{ background: zone.color + 'cc' }}>
                        {zone.label} Safe Zones
                      </div>
                    </div>
                  )}

                  {/* Play button overlay */}
                  <button onClick={() => videoRef.current?.[playing ? 'pause' : 'play']()}
                    className="absolute inset-0 flex items-center justify-center group">
                    <div className={`w-14 h-14 rounded-full bg-black/50 flex items-center justify-center transition-opacity ${playing ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
                      {playing ? <Pause className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 text-white ml-1" />}
                    </div>
                  </button>
                </div>
              </div>

              {/* Legend */}
              {showZones && (
                <div className="glass-card rounded-2xl p-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Overlay Legend</p>
                  <div className="flex flex-col gap-1.5">
                    {zone.zones.map((z, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: zone.color, opacity: z.opacity * 2.5 }} />
                        <span className="text-xs text-muted-foreground">{z.label}</span>
                      </div>
                    ))}
                    <p className="text-[10px] text-muted-foreground/50 mt-1">
                      Keep key content (faces, text, CTAs) out of shaded regions.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Social Previews tab */}
          {activeTab === 'social' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="glass-card rounded-2xl p-4">
                {thumbnail ? (
                  <p className="text-sm text-muted-foreground">
                    Here&rsquo;s how your video looks across social platforms with the captured thumbnail.
                  </p>
                ) : (
                  <button
                    onClick={() => setActiveTab('thumbnail')}
                    className="w-full text-left flex items-start gap-3 group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold group-hover:text-primary transition-colors">
                        Capture a thumbnail to fill in these previews
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Jump to the Thumbnail Builder tab, scrub to a frame, and click Capture &rarr;
                      </p>
                    </div>
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-6 justify-center">
                <TikTokMock videoSrc={videoSrc} thumbnail={thumbnail} playing={playing} onToggle={() => {}} />
                <InstagramMock thumbnail={thumbnail} isReel />
                <TwitterMock thumbnail={thumbnail} />
                <InstagramMock thumbnail={thumbnail} isReel={false} />
              </div>
            </motion.div>
          )}

          {/* Thumbnail Builder tab */}
          {activeTab === 'thumbnail' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="glass-card rounded-2xl p-5 space-y-4">
                <p className="text-sm font-semibold">Capture a frame as thumbnail</p>
                {/* Scrubber */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground font-mono">
                    <span>0:00</span>
                    <span className="text-primary font-semibold">{Math.floor(thumbTime / 60)}:{String(Math.floor(thumbTime % 60)).padStart(2, '0')}</span>
                    <span>{Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}</span>
                  </div>
                  <input type="range" min={0} max={duration || 100} step={0.1} value={thumbTime}
                    onChange={handleSeek} className="w-full accent-primary" />
                </div>
                {/* Hidden video for frame capture */}
                <video ref={videoRef} src={videoSrc} className="w-full rounded-xl max-h-64 object-contain bg-black"
                  onLoadedMetadata={e => setDuration(e.target.duration)} playsInline />
                <canvas ref={canvasRef} className="hidden" />

                <div className="flex gap-3">
                  <button onClick={captureThumb}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all bg-gradient-to-r ${toolGradient.color} text-white`}>
                    {thumbCaptured ? <><Check className="w-4 h-4" /> Captured!</> : <><Camera className="w-4 h-4" /> Capture Frame</>}
                  </button>
                  {thumbnail && (
                    <button onClick={downloadThumb}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass-card text-sm font-medium text-foreground hover:text-primary transition-colors">
                      <Download className="w-4 h-4" /> Save
                    </button>
                  )}
                </div>
              </div>

              {thumbnail && (
                <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="glass-card rounded-2xl p-5 space-y-3">
                  <p className="text-sm font-semibold">Captured Thumbnail</p>
                  <img src={thumbnail} alt="Captured thumbnail" className="w-full rounded-xl object-cover shadow-lg" style={{ maxHeight: 280 }} />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['YouTube', 'TikTok', 'Instagram', 'Twitter'].map(platform => (
                      <div key={platform} className="text-center">
                        <div className="rounded-lg overflow-hidden bg-black mb-1"
                          style={{ aspectRatio: platform === 'Instagram' ? '1/1' : platform === 'TikTok' ? '9/16' : '16/9', maxHeight: 80 }}>
                          <img src={thumbnail} alt={platform} className="w-full h-full object-cover" />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{platform}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </div>
      ) : null}
    </div>
  );
}

