/**
 * PrintSlot semantic design tokens — F1.
 *
 * The single source of truth for color. Light-first **warm glass-fintech**, indigo
 * accent extended by a tokenized indigo→violet gradient (Fork 1 + Fork 3). Values
 * are taken verbatim from the design spec §3 and the prototype `styles.css` CSS
 * variables. Screens consume these via `useThemeTokens()` — never raw hex.
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

/** Governed soft-pastel grouping set (spec §3) — stat / grouping cards only. */
export type PastelKey = 'lavender' | 'mint' | 'peach' | 'sky';

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
  /**
   * Indigo→violet brand gradient stops (spec §3, `gradientBrand`). Decorative
   * surface only: hero cards, primary `Button`, FAB, `Avatar`, brand mark. Always
   * carries white text at AA — never derive text/icon color from it.
   */
  gradientBrand: readonly [string, string, string];
  /** Text/icon color that sits on top of `primary` / `gradientBrand`. */
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
  bgGradient: ['#e9e7fb', '#f5f4fc', '#fbeef6'],
  surface: '#FFFFFF',
  surfaceFrost: 'rgba(255,255,255,0.74)',
  textPrimary: '#0F1222',
  textSecondary: '#51566B',
  textMuted: '#8A8FA3',
  border: '#E7E6F3',
  primary: '#4F46E5',
  primaryPressed: '#4338CA',
  gradientBrand: ['#5B4DE3', '#7C3AED', '#A855F7'],
  onPrimary: '#FFFFFF',
  success: '#16A34A',
  warn: '#D97706',
  error: '#DC2626',
  info: '#2563EB',
  violet: '#7C3AED',
  tintSoft: 'rgba(79,70,229,0.08)',
  skeletonBase: '#ECEEF5',
  skeletonHighlight: '#F6F7FB',
  shadowCard: '0 12px 30px rgba(40,38,80,0.07)',
  shadowFrost: '0 14px 44px rgba(79,70,229,0.16)',
  scrim: 'rgba(8,9,16,0.5)',
  toastSurface: '#1C1F2E',
  toastText: '#FFFFFF',
};

const DARK: ThemeTokens = {
  bgGradient: ['#221c4a', '#0b0b14', '#1c1140'],
  surface: '#14151F',
  surfaceFrost: 'rgba(15,16,26,0.62)',
  textPrimary: '#F4F5FA',
  textSecondary: '#AEB2C4',
  textMuted: '#6E7388',
  border: '#262838',
  primary: '#6366F1',
  primaryPressed: '#4F46E5',
  gradientBrand: ['#6366F1', '#8B5CF6', '#A855F7'],
  onPrimary: '#FFFFFF',
  success: '#22C55E',
  warn: '#F59E0B',
  error: '#F87171',
  info: '#3B82F6',
  violet: '#A78BFA',
  tintSoft: 'rgba(99,102,241,0.16)',
  skeletonBase: '#1C1E2B',
  skeletonHighlight: '#24263A',
  shadowCard: '0 10px 28px rgba(0,0,0,0.42)',
  shadowFrost: '0 14px 44px rgba(0,0,0,0.50)',
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

/**
 * Soft-pastel grouping set (spec §3). Each pastel is a `bg` (surface) + `fg` (ink)
 * pair where the ink clears AA on its own tint. Light = solid pastel surface;
 * dark = translucent tint over the dark surface with a light ink. Stat grids
 * rotate lavender → mint → peach → sky. Never used for status (Section 4 owns that).
 */
const LIGHT_PASTELS: Record<PastelKey, ToneStyle> = {
  lavender: { fg: '#6D28D9', bg: '#ECE9FB' },
  mint: { fg: '#15803D', bg: '#E3F7EC' },
  peach: { fg: '#C2410C', bg: '#FDEADD' },
  sky: { fg: '#1D4ED8', bg: '#E3EFFD' },
};

const DARK_PASTELS: Record<PastelKey, ToneStyle> = {
  lavender: { fg: '#C4B5FD', bg: 'rgba(139,92,246,0.18)' },
  mint: { fg: '#4ADE80', bg: 'rgba(34,197,94,0.15)' },
  peach: { fg: '#FB923C', bg: 'rgba(249,115,22,0.16)' },
  sky: { fg: '#93C5FD', bg: 'rgba(59,130,246,0.16)' },
};

export const themes: Record<ThemeName, ThemeTokens> = {
  light: LIGHT,
  dark: DARK,
};

export const tones: Record<ThemeName, Record<ToneKey, ToneStyle>> = {
  light: LIGHT_TONES,
  dark: DARK_TONES,
};

export const pastels: Record<ThemeName, Record<PastelKey, ToneStyle>> = {
  light: LIGHT_PASTELS,
  dark: DARK_PASTELS,
};

/** Ordered pastel rotation for stat / grouping grids (spec §3). */
export const pastelRotation: readonly PastelKey[] = [
  'lavender',
  'mint',
  'peach',
  'sky',
] as const;

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
 * Radii (Fork 6, warm glass-fintech): 20 for cards, 24 for hero / frost surfaces,
 * 14 for controls, 10 for small chips/icon tiles, full for pills.
 * All consumers pair these with `borderCurve: 'continuous'`.
 */
export const radii = {
  sm: 10,
  control: 14,
  card: 20,
  hero: 24,
  full: 9999,
} as const;
