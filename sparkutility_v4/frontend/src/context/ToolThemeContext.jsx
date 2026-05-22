import React, { createContext, useContext, useState, useCallback } from 'react';

const TOOL_THEME_KEY = 'sparkutility_tool_themes';

export const GRADIENT_PRESETS = [
  { id: 'retro-sunset',  label: 'Retro Sunset',   color: 'from-pink-500 to-orange-400',       glow: 'rgba(236,72,153,0.25)',   preview: ['#ec4899', '#fb923c'] },
  { id: 'violet-cyan',   label: 'Violet Cyan',     color: 'from-violet-500 to-cyan-400',        glow: 'rgba(139,92,246,0.25)',   preview: ['#8b5cf6', '#22d3ee'] },
  { id: 'emerald-teal',  label: 'Emerald Teal',    color: 'from-emerald-500 to-teal-400',       glow: 'rgba(16,185,129,0.25)',   preview: ['#10b981', '#2dd4bf'] },
  { id: 'amber-red',     label: 'Amber Red',       color: 'from-amber-500 to-red-400',          glow: 'rgba(245,158,11,0.25)',   preview: ['#f59e0b', '#f87171'] },
  { id: 'blue-indigo',   label: 'Blue Indigo',     color: 'from-blue-500 to-indigo-400',        glow: 'rgba(59,130,246,0.25)',   preview: ['#3b82f6', '#818cf8'] },
  { id: 'rose-fuchsia',  label: 'Rose Fuchsia',    color: 'from-rose-500 to-fuchsia-400',       glow: 'rgba(244,63,94,0.25)',    preview: ['#f43f5e', '#e879f9'] },
  { id: 'lime-green',    label: 'Lime Green',      color: 'from-lime-500 to-green-400',         glow: 'rgba(132,204,22,0.25)',   preview: ['#84cc16', '#4ade80'] },
  { id: 'sky-violet',    label: 'Sky Violet',      color: 'from-sky-500 to-violet-400',         glow: 'rgba(14,165,233,0.25)',   preview: ['#0ea5e9', '#a78bfa'] },
  { id: 'cyber-green',   label: 'Cyber Green',     color: 'from-green-400 to-emerald-600',      glow: 'rgba(74,222,128,0.25)',   preview: ['#4ade80', '#059669'] },
  { id: 'neon-pink',     label: 'Neon Pink',       color: 'from-fuchsia-500 to-pink-600',       glow: 'rgba(217,70,239,0.25)',   preview: ['#d946ef', '#db2777'] },
];

const DEFAULT_TOOL_THEMES = {
  '/file-converter':           'violet-cyan',
  '/image-editor':             'retro-sunset',
  '/image-modifier':           'retro-sunset',
  '/audio-modifier':           'cyber-green',
  '/content-previewer':        'sky-violet',
  '/fluxkit/latex-builder':    'amber-red',
};

const ToolThemeContext = createContext(null);

export function ToolThemeProvider({ children }) {
  const [toolThemes, setToolThemes] = useState(() => {
    try {
      const stored = localStorage.getItem(TOOL_THEME_KEY);
      return stored ? { ...DEFAULT_TOOL_THEMES, ...JSON.parse(stored) } : DEFAULT_TOOL_THEMES;
    } catch {
      return DEFAULT_TOOL_THEMES;
    }
  });

  const getToolGradient = useCallback((path) => {
    const presetId = toolThemes[path] || 'violet-cyan';
    return GRADIENT_PRESETS.find(p => p.id === presetId) || GRADIENT_PRESETS[0];
  }, [toolThemes]);

  const setToolGradient = useCallback((path, presetId) => {
    setToolThemes(prev => {
      const next = { ...prev, [path]: presetId };
      try { localStorage.setItem(TOOL_THEME_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  return (
    <ToolThemeContext.Provider value={{ toolThemes, getToolGradient, setToolGradient, GRADIENT_PRESETS }}>
      {children}
    </ToolThemeContext.Provider>
  );
}

export const useToolTheme = () => useContext(ToolThemeContext);
