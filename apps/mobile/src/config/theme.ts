/**
 * PrintSlot Design System Tokens — LEGACY (pre-Phase-0).
 *
 * Premium dark theme with vibrant orange accent.
 *
 * DEPRECATED: This module is retained only for backward compatibility with the
 * five already-built screens (login, register, shop list, shop detail, profile)
 * that still import `{ colors, spacing, borderRadius, typography }` from here.
 * Those screens migrate to the new semantic token system in later PRs.
 *
 * For all NEW code use the Phase-0 design system instead:
 *   - Semantic light/dark tokens + `useThemeTokens()` → `@/theme`
 *   - The `Text` primitive (font-by-language, tabular figures) → `@/components/ui`
 * Do NOT add new consumers of this legacy palette.
 */
export const colors = {
  // Brand
  primary: '#FF6B35',
  primaryLight: '#FF8A5C',
  primaryDark: '#E55A25',

  // Backgrounds
  background: '#0F0F1A',
  surface: '#1A1A2E',
  surfaceElevated: '#252540',
  card: '#1E1E35',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0B8',
  textTertiary: '#6B6B82',
  textInverse: '#0F0F1A',

  // Accents
  success: '#4ADE80',
  warning: '#FBBF24',
  error: '#F87171',
  info: '#60A5FA',

  // Borders
  border: '#2A2A45',
  borderLight: '#353555',
  borderFocus: '#FF6B35',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.6)',
  glassBg: 'rgba(26, 26, 46, 0.85)',
} as const;

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

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const typography = {
  /** Display — onboarding, splash */
  displayLg: {
    fontSize: 36,
    fontWeight: '800' as const,
    lineHeight: 44,
    letterSpacing: -0.5,
  },
  /** H1 — screen titles */
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  /** H2 — section headers */
  h2: {
    fontSize: 22,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  /** H3 — card titles */
  h3: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  /** Body — primary readable text */
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  /** Body small — secondary text */
  bodySm: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  /** Caption — labels, hints */
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  /** Button text */
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
    letterSpacing: 0.3,
  },
} as const;

const theme = {
  colors,
  spacing,
  borderRadius,
  typography,
} as const;

export type Theme = typeof theme;
export default theme;
