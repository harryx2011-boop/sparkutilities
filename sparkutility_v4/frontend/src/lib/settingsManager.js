const STORAGE_KEY = 'sparkutility_user_settings';

export const DEFAULT_SETTINGS = {
  // Privacy & Security
  autoScrubMetadata:   false,
  sessionPersistence:  'always', // 'session' | '24h' | 'always'
  incognitoProcessing: true,
  secureLinkExpiry:    30,       // minutes (5–1440)
  // Performance & System
  hardwareAcceleration: true,
  lowPowerMode:         false,
  memoryManagement:     true,
  sparkSearchIndexing:  true,
  // Keyboard Shortcuts (user-remappable)
  keybinds: {
    sparkEngine:    'k',          // modifier (Ctrl/Cmd) + this key
    convertFiles:   'Space',      // FileConverter batch convert
    deleteFile:     'Delete',     // FileConverter delete selected
    clearSelection: 'Escape',     // FileConverter clear selection
    playPause:      'Space',      // AudioModifier play/pause
    imageUndo:      'Mod+z',       // Cmd+Z on Mac, Ctrl+Z elsewhere
    imageRedo:      'Mod+Shift+z', // Cmd/Ctrl+Shift+Z (Cmd/Ctrl+Y also accepted via second binding)
    imageRedoAlt:   'Mod+y',
    imageToolPen:   'p',          // single-key tool switches when no modifier
    imageToolBrush: 'b',
    imageToolEraser:'e',
    previewerPlayPause: 'Space',  // Toggle the embedded video preview
  },
  // Appearance
  customTheme: null,             // null = use base theme | 'base'|'cyber'|'retro-sunset'|'minimal'
  dyslexiaFont: false,           // applies OpenDyslexic across the whole UI
  // Sidebar
  sidebarEnabled: true,
  pinnedTools: [],
};

export function loadSettings() {
  try {
    // Session-persistence mode: check sessionStorage first
    const sessRaw = sessionStorage.getItem(STORAGE_KEY);
    if (sessRaw) {
      const sess = JSON.parse(sessRaw);
      if (sess?.sessionPersistence === 'session') {
        return { ...DEFAULT_SETTINGS, ...sess };
      }
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const data = JSON.parse(raw);

    // Enforce 24-hour expiry
    if (data.sessionPersistence === '24h' && data._savedAt) {
      if (Date.now() - data._savedAt > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(STORAGE_KEY);
        return { ...DEFAULT_SETTINGS };
      }
    }

    const { _savedAt, ...settings } = data;
    return { ...DEFAULT_SETTINGS, ...settings };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  try {
    if (settings.sessionPersistence === 'session') {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      localStorage.removeItem(STORAGE_KEY);
    } else if (settings.sessionPersistence === '24h') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...settings, _savedAt: Date.now() }));
      sessionStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch { /* storage full or private mode */ }
}

export function clearSettings() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}
