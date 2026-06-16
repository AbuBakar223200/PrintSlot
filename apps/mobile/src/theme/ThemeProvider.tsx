import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AccessibilityInfo, useColorScheme } from 'react-native';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import {
  pastels,
  radii,
  spacing,
  themes,
  tones,
  type PastelKey,
  type ThemeName,
  type ThemeTokens,
  type ToneKey,
  type ToneStyle,
} from './tokens';

/**
 * F1 — ThemeProvider.
 *
 * Resolves the active color scheme from `useSettingsStore.themePreference`:
 *  - `'system'` → follows the OS (`useColorScheme`), updating live.
 *  - `'light'` / `'dark'` → manual override set from Profile (Fork 2).
 *
 * Also exposes `reduceMotion` (honored by AmbientBackground + the motion budget,
 * §6) so animated surfaces can freeze for accessibility (Fork 13).
 */
export interface ThemeContextValue {
  /** Resolved theme name after applying preference + system scheme. */
  name: ThemeName;
  /** Resolved semantic color tokens. */
  tokens: ThemeTokens;
  /** Resolved tinted tone styles (StatusBadge / Banner / tinted icons). */
  tones: Record<ToneKey, ToneStyle>;
  /** Resolved soft-pastel grouping styles (stat / grouping cards). */
  pastels: Record<PastelKey, ToneStyle>;
  /** Spacing scale (theme-agnostic). */
  spacing: typeof spacing;
  /** Radii (theme-agnostic). */
  radii: typeof radii;
  /** True when the OS reduce-motion setting is on. */
  reduceMotion: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Default (light) context used when a consumer renders outside a `<ThemeProvider>`
 * — e.g. isolated unit tests or Storybook. The app root always mounts the real
 * provider, so in production this default is never observed; it just keeps
 * primitives renderable in isolation instead of throwing.
 */
const DEFAULT_THEME_CONTEXT: ThemeContextValue = {
  name: 'light',
  tokens: themes.light,
  tones: tones.light,
  pastels: pastels.light,
  spacing,
  radii,
  reduceMotion: false,
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const themePreference = useSettingsStore((s) => s.themePreference);
  const [reduceMotion, setReduceMotion] = useState(false);

  // Track the OS reduce-motion setting (Fork 13 / §6).
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => setReduceMotion(enabled),
    );
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  const name: ThemeName =
    themePreference === 'system'
      ? systemScheme === 'dark'
        ? 'dark'
        : 'light'
      : themePreference;

  const value = useMemo<ThemeContextValue>(
    () => ({
      name,
      tokens: themes[name],
      tones: tones[name],
      pastels: pastels[name],
      spacing,
      radii,
      reduceMotion,
    }),
    [name, reduceMotion],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/**
 * Full theme context: tokens, tones, spacing, radii, scheme name, reduce-motion.
 * Primitives that need more than colors (e.g. AmbientBackground) use this.
 */
export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext) ?? DEFAULT_THEME_CONTEXT;
}

/**
 * F1 — `useThemeTokens()`.
 *
 * The primary primitive-facing hook. Returns the resolved semantic color tokens
 * for the active theme. Screens and primitives consume these — never raw hex.
 */
export function useThemeTokens(): ThemeTokens {
  return useTheme().tokens;
}
