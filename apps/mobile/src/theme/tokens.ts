/**
 * PrintSlot semantic design tokens — F1.
 *
 * The single source of truth for color. Light-first fintech, indigo accent
 * (Fork 1 + Fork 3). Values are taken verbatim from the design spec §3 and the
 * prototype `styles.css` CSS variables. Screens consume these via
 * `useThemeTokens()` — never raw hex.
 *
 * `color-mix(...)` from the prototype is precomputed to static rgba here
 * (RN has no runtime color-mix). Real `expo-blur` runs only in iOS hero zones;
 * elsewhere `surfaceFrost` is the solid "fake frost" fallback.
 */

export type ThemeName = 'light' | 'dark';

/** Tone keys shared by StatusBadge, Banner, and tinted icon surfaces. */
export type ToneKey =
  | 'info'
  | 'violet'
  | 'warn'
  | 'success'
  | 'muted'
  | 'error'
  | 'primary';

export interface ThemeTokens {
  /** Ambient backdrop gradient stops (top → mid → bottom-ish wash). */
  bgGradient: readonly [string, string, string];
  /** Solid card / sheet base. */
  surface: string;
  /** Frosted hero card fill (also the Android/low-end "fake frost" solid). */
  surfaceFrost: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  /** Hairlines, dividers, input borders. */
  border: string;
  /** Indigo accent, primary actions. */
  primary: string;
  primaryPressed: string;
  /** Text/icon color that sits on top of `primary`. */
  onPrimary: string;
  success: string;
  warn: string;
  error: string;
  info: string;
  /** Dedicated SCHEDULED badge hue from the indigo family (§4.1). */
  violet: string;
  /** Soft indigo wash — segmented-control track, chips, tinted icon circles. */
  tintSoft: string;
  /** Skeleton shimmer base + highlight (animated via opacity/transform). */
  skeletonBase: string;
  skeletonHighlight: string;
  /** Card / frost shadows as RN boxShadow strings. */
  shadowCard: string;
  shadowFrost: string;
  /** Scrim behind sheets / modals. */
  scrim: string;
  /** Toast surface (dark chip in both themes) + its text. */
  toastSurface: string;
  toastText: string;
}

/**
 * Per-tone fill (tinted background) + foreground (text/icon) pairs.
 * Precomputed from the prototype's `color-mix(in srgb, var(--tone) X%, transparent)`.
 */
export interface ToneStyle {
  fg: string;
  bg: string;
}

const LIGHT: ThemeTokens = {
  bgGradient: ['#eef0fb', '#ffffff', '#fdf3ee'],
  surface: '#FFFFFF',
  surfaceFrost: 'rgba(255,255,255,0.78)',
  textPrimary: '#0F1222',
  textSecondary: '#51566B',
  textMuted: '#8A8FA3',
  border: '#E6E8F0',
  primary: '#4F46E5',
  primaryPressed: '#4338CA',
  onPrimary: '#FFFFFF',
  success: '#16A34A',
  warn: '#D97706',
  error: '#DC2626',
  info: '#2563EB',
  violet: '#7C3AED',
  tintSoft: 'rgba(79,70,229,0.08)',
  skeletonBase: '#ECEEF5',
  skeletonHighlight: '#F6F7FB',
  shadowCard: '0 8px 24px rgba(16,18,34,0.06)',
  shadowFrost: '0 8px 40px rgba(79,70,229,0.10)',
  scrim: 'rgba(8,9,16,0.5)',
  toastSurface: '#1C1F2E',
  toastText: '#FFFFFF',
};

const DARK: ThemeTokens = {
  bgGradient: ['#1a1740', '#0b0b14', '#14122a'],
  surface: '#14151F',
  surfaceFrost: 'rgba(15,16,26,0.66)',
  textPrimary: '#F4F5FA',
  textSecondary: '#AEB2C4',
  textMuted: '#6E7388',
  border: '#262838',
  primary: '#6366F1',
  primaryPressed: '#4F46E5',
  onPrimary: '#FFFFFF',
  success: '#22C55E',
  warn: '#F59E0B',
  error: '#F87171',
  info: '#3B82F6',
  violet: '#A78BFA',
  tintSoft: 'rgba(99,102,241,0.16)',
  skeletonBase: '#1C1E2B',
  skeletonHighlight: '#24263A',
  shadowCard: '0 8px 24px rgba(0,0,0,0.40)',
  shadowFrost: '0 8px 40px rgba(0,0,0,0.50)',
  scrim: 'rgba(8,9,16,0.6)',
  toastSurface: '#2A2D3E',
  toastText: '#FFFFFF',
};

/**
 * Tinted tone styles per theme. Precomputed from the prototype's badge/banner
 * `color-mix` ratios so tinted fills survive without a runtime color-mix.
 * `muted` foreground intentionally uses `textMuted` (per prototype `.badge.tone-muted`).
 */
const LIGHT_TONES: Record<ToneKey, ToneStyle> = {
  info: { fg: '#2563EB', bg: 'rgba(37,99,235,0.14)' },
  violet: { fg: '#7C3AED', bg: 'rgba(124,58,237,0.16)' },
  warn: { fg: '#D97706', bg: 'rgba(217,119,6,0.16)' },
  success: { fg: '#16A34A', bg: 'rgba(22,163,74,0.15)' },
  muted: { fg: '#8A8FA3', bg: 'rgba(138,143,163,0.18)' },
  error: { fg: '#DC2626', bg: 'rgba(220,38,38,0.14)' },
  primary: { fg: '#4F46E5', bg: 'rgba(79,70,229,0.08)' },
};

const DARK_TONES: Record<ToneKey, ToneStyle> = {
  info: { fg: '#3B82F6', bg: 'rgba(59,130,246,0.14)' },
  violet: { fg: '#A78BFA', bg: 'rgba(167,139,250,0.16)' },
  warn: { fg: '#F59E0B', bg: 'rgba(245,158,11,0.16)' },
  success: { fg: '#22C55E', bg: 'rgba(34,197,94,0.15)' },
  muted: { fg: '#6E7388', bg: 'rgba(110,115,136,0.18)' },
  error: { fg: '#F87171', bg: 'rgba(248,113,113,0.14)' },
  primary: { fg: '#6366F1', bg: 'rgba(99,102,241,0.16)' },
};

export const themes: Record<ThemeName, ThemeTokens> = {
  light: LIGHT,
  dark: DARK,
};

export const tones: Record<ThemeName, Record<ToneKey, ToneStyle>> = {
  light: LIGHT_TONES,
  dark: DARK_TONES,
};

/** Spacing scale (unchanged from the legacy theme — purely numeric, theme-agnostic). */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
} as const;

/**
 * Radii (Fork 6): 16 for cards, 12 for controls, full for pills.
 * All consumers pair these with `borderCurve: 'continuous'`.
 */
export const radii = {
  control: 12,
  card: 16,
  full: 9999,
} as const;
