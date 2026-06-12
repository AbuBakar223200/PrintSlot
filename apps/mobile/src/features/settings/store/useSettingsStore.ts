import { create } from 'zustand';
import { Language } from '@printslot/shared';

/**
 * UI-state store for user preferences (Fork 2 + Fork 11).
 *
 * Zustand holds UI state only (AGENTS §15.2) — never server data.
 *  - `themePreference` drives the active color scheme. `'system'` follows the OS.
 *  - `language` drives Fork-11 numerals + i18next language app-wide.
 *  - `isOffline` is the app-wide connectivity flag consumed by OfflineBanner /
 *    mutation gating.
 *
 * The Profile Theme/Language SegmentedControls write here; ThemeProvider and the
 * i18n layer read here. Persistence (SecureStore / AsyncStorage) is wired in a
 * later slice — this store is the in-memory source of truth for now.
 */
export type ThemePreference = 'light' | 'dark' | 'system';

interface SettingsState {
  /** User's explicit theme choice. `'system'` defers to the OS scheme. */
  themePreference: ThemePreference;
  /** Active UI language (drives numerals + font selection). */
  language: Language;
  /** App-wide connectivity flag — true when the device is offline. */
  isOffline: boolean;
  setThemePreference: (pref: ThemePreference) => void;
  setLanguage: (language: Language) => void;
  setOffline: (isOffline: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  themePreference: 'system',
  language: Language.EN,
  isOffline: false,
  setThemePreference: (themePreference) => set({ themePreference }),
  setLanguage: (language) => set({ language }),
  setOffline: (isOffline) => set({ isOffline }),
}));
