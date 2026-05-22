import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

const THEMES = {
  base: { label: 'BASE', class: '', description: 'Dark glassmorphism style with violet-to-cyan gradients' },
  cyber: { label: 'Cyber', class: 'theme-cyber', description: 'Neon-green, matrix, terminal-like aesthetic' },
  'retro-sunset': { label: 'Retro-Sunset', class: 'theme-retro-sunset', description: 'Warm orange-pink-purple synthwave' },
  minimal: { label: 'Minimal', class: 'theme-minimal', description: 'Clean-white with subtle grey borders' },
};

// Natural mode (dark vs light) for each base theme palette.
const THEME_MODE = {
  base: 'dark',
  cyber: 'dark',
  'retro-sunset': 'dark',
  minimal: 'light',
};

const USER_PREF_KEY  = 'sparkutility_user_mode';
const BASE_THEME_KEY = 'sparkutility_admin_theme';   // legacy key retained for upgrade compatibility

export function ThemeProvider({ children }) {
  const [baseTheme, setBaseTheme] = useState(() => {
    try {
      const stored = localStorage.getItem(BASE_THEME_KEY);
      return stored && THEMES[stored] ? stored : 'base';
    } catch {
      return 'base';
    }
  });

  const [userMode, setUserMode] = useState(() => {
    try {
      const stored = localStorage.getItem(USER_PREF_KEY);
      return stored === 'light' || stored === 'dark' ? stored : null;
    } catch {
      return null;
    }
  });

  // Resolved active theme: userMode toggle wins, else baseTheme.
  const activeTheme = userMode === 'light'
    ? 'minimal'
    : userMode === 'dark'
      ? (baseTheme === 'minimal' ? 'base' : baseTheme)
      : baseTheme;

  // Apply theme class to <html> whenever activeTheme changes.
  useEffect(() => {
    const root = document.documentElement;
    Object.values(THEMES).forEach(t => {
      if (t.class) root.classList.remove(t.class);
    });
    const themeClass = THEMES[activeTheme]?.class;
    if (themeClass) root.classList.add(themeClass);
  }, [activeTheme]);

  const changeTheme = (themeKey) => {
    if (!THEMES[themeKey]) return;
    setBaseTheme(themeKey);
    try { localStorage.setItem(BASE_THEME_KEY, themeKey); } catch { /* ignore */ }
    if (userMode) {
      setUserMode(null);
      try { localStorage.removeItem(USER_PREF_KEY); } catch { /* ignore */ }
    }
  };

  const currentMode = userMode || THEME_MODE[baseTheme] || 'dark';

  const toggleUserMode = () => {
    const next = currentMode === 'dark' ? 'light' : 'dark';
    setUserMode(next);
    try { localStorage.setItem(USER_PREF_KEY, next); } catch { /* ignore */ }
  };

  const clearUserMode = () => {
    setUserMode(null);
    try { localStorage.removeItem(USER_PREF_KEY); } catch { /* ignore */ }
  };

  return (
    <ThemeContext.Provider value={{
      activeTheme,
      adminTheme: baseTheme,          // alias preserved for callers expecting `adminTheme`
      baseTheme,
      changeTheme,
      THEMES,
      isLoading: false,
      currentMode,
      userMode,
      toggleUserMode,
      clearUserMode,
      customTheme: null,
      setCustomTheme: () => {},
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
export { THEMES };
