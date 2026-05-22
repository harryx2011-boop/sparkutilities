import { RefreshCw, Wand2, Zap, Database, Palette, ShieldCheck, Wrench, Settings2, Music, Eye, Hash } from 'lucide-react';

export const SEARCH_INDEX = [
  // ── Utilities ────────────────────────────────────────────────────────────
  {
    id:          'file-converter',
    path:        '/file-converter',
    label:       'File Converter',
    category:    'Utilities',
    description: 'Convert video, audio, image & document files between dozens of formats',
    keywords:    ['convert', 'video', 'audio', 'image', 'document', 'mp4', 'mp3', 'webp', 'pdf', 'ffmpeg', 'format', 'batch', 'gif'],
    Icon:        RefreshCw,
  },
  {
    id:          'image-editor',
    path:        '/image-editor',
    label:       'Image Editor',
    category:    'Utilities',
    description: 'Lightroom-style sliders, MS-Paint drawing, crop, rotate, filters — all in-browser',
    keywords:    ['image', 'edit', 'editor', 'crop', 'rotate', 'filter', 'lightroom', 'paint', 'draw', 'pen', 'brush', 'eraser', 'exposure', 'highlights', 'shadows', 'saturation', 'vibrance', 'temperature', 'tint'],
    Icon:        Wand2,
  },
  {
    id:          'audio-modifier',
    path:        '/audio-modifier',
    label:       'Audio Modifier',
    category:    'Utilities',
    description: 'EQ, bass boost, reverb, trim and pitch — real-time preview, ±18 dB clamped for safety',
    keywords:    ['audio', 'modifier', 'eq', 'equalizer', 'bass', 'treble', 'reverb', 'trim', 'pitch', 'volume', 'tempo', 'pan', 'wav', 'export'],
    Icon:        Music,
  },
  {
    id:          'content-previewer',
    path:        '/content-previewer',
    label:       'Content Previewer',
    category:    'Utilities',
    description: 'Safe-zone overlays for TikTok / Reels / Shorts / X / Insta posts, social mockups, frame thumbnail capture',
    keywords:    ['preview', 'previewer', 'safe', 'zone', 'tiktok', 'reels', 'shorts', 'instagram', 'twitter', 'x', 'thumbnail', 'social', 'mockup', 'frame', 'capture'],
    Icon:        Eye,
  },

  // ── FluxKit ───────────────────────────────────────────────────────────────
  {
    id:          'fluxkit',
    path:        '/fluxkit',
    label:       'FluxKit Home',
    category:    'FluxKit',
    description: 'Developer toolkit hub — 21 browser-native tools across 5 categories',
    keywords:    ['fluxkit', 'developer', 'tools', 'toolkit', 'dev'],
    Icon:        Zap,
  },
  {
    id:          'data-structure',
    path:        '/fluxkit/data-structure',
    label:       'Data & Structure',
    category:    'FluxKit',
    description: 'JSON validator, XML→JSON, CSV→JSON, YAML↔JSON, SQL formatter',
    keywords:    ['json', 'xml', 'csv', 'yaml', 'sql', 'validate', 'format', 'convert', 'data', 'structure', 'parse'],
    Icon:        Database,
  },
  {
    id:          'web-dev-assets',
    path:        '/fluxkit/web-dev-assets',
    label:       'Web Dev Assets',
    category:    'FluxKit',
    description: 'CSS glassmorphism, SVG optimizer, flexbox/grid playground, colour converter, scrollbar builder',
    keywords:    ['css', 'svg', 'flexbox', 'grid', 'colour', 'color', 'hex', 'scrollbar', 'glassmorphism', 'gradient', 'layout'],
    Icon:        Palette,
  },
  {
    id:          'security-logic',
    path:        '/fluxkit/security-logic',
    label:       'Security & Logic',
    category:    'FluxKit',
    description: 'JWT decoder, regex tester, cron parser, bcrypt generator, HTML entity encoder',
    keywords:    ['jwt', 'regex', 'cron', 'bcrypt', 'hash', 'html', 'entity', 'security', 'encode', 'decode', 'token'],
    Icon:        ShieldCheck,
  },
  {
    id:          'productivity',
    path:        '/fluxkit/productivity',
    label:       'Productivity Tools',
    category:    'FluxKit',
    description: 'Diff viewer, console log generator, cURL→Fetch/Axios, Markdown preview, URL parser',
    keywords:    ['diff', 'console', 'log', 'curl', 'fetch', 'axios', 'markdown', 'url', 'parse', 'productivity'],
    Icon:        Wrench,
  },
  {
    id:          'latex-builder',
    path:        '/fluxkit/latex-builder',
    label:       'LaTeX Builder',
    category:    'FluxKit',
    description: 'Build equations visually, live KaTeX preview, matrix builder, alt-text generator, PNG export',
    keywords:    ['latex', 'math', 'equation', 'katex', 'matrix', 'symbol', 'greek', 'integral', 'sum', 'formula'],
    Icon:        Hash,
  },

  // ── System ──────────────────────────────────────────────────────────
  {
    id:          'settings',
    path:        '/settings',
    label:       'Settings',
    category:    'System',
    description: 'Privacy, performance, session persistence and SparkSearch preferences',
    keywords:    ['settings', 'preferences', 'privacy', 'performance', 'theme', 'config'],
    Icon:        Settings2,
  },
];

export function runSearch(query) {
  const q = query.toLowerCase().trim();
  if (!q) return SEARCH_INDEX;

  return SEARCH_INDEX
    .map(item => {
      const label = item.label.toLowerCase();
      const desc  = item.description.toLowerCase();
      const kws   = item.keywords.join(' ');
      let score   = 0;

      if (label === q)             score += 120;
      else if (label.startsWith(q)) score += 90;
      else if (label.includes(q))   score += 60;

      if (desc.includes(q)) score += 25;
      if (kws.includes(q))  score += 15;

      for (const word of q.split(/\s+/)) {
        if (word.length < 2) continue;
        if (label.includes(word)) score += 12;
        if (desc.includes(word))  score += 6;
        if (kws.includes(word))   score += 4;
      }

      return score > 0 ? { ...item, score } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}
