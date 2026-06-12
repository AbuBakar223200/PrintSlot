/**
 * F2 — Typography families + scale.
 *
 * Fonts are embedded at BUILD TIME via the `expo-font` config plugin (Fork 4 /
 * AGENTS §14) — see `app.json` → plugins → expo-font. The family names below
 * match the embedded `@expo-google-fonts/*` PostScript names, so there is no
 * async `useFonts`, no first-paint flash, and no loading state in components.
 *
 *  - Latin / UI / body → Inter (with tabular figures for money).
 *  - Bengali → Hind Siliguri.
 *
 * The `Text` primitive selects the family by the active language (Fork 11). On
 * RN, an explicit `fontFamily` is required per weight — `fontWeight` alone does
 * not pick the embedded weight file. Hence one family name per weight.
 */
import { Language } from '@printslot/shared';

export type FontWeightKey = 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold';

const INTER: Record<FontWeightKey, string> = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
};

// Hind Siliguri ships no ExtraBold (800) weight — Bold (700) is its heaviest.
const HIND: Record<FontWeightKey, string> = {
  regular: 'HindSiliguri_400Regular',
  medium: 'HindSiliguri_500Medium',
  semibold: 'HindSiliguri_600SemiBold',
  bold: 'HindSiliguri_700Bold',
  extrabold: 'HindSiliguri_700Bold',
};

/** Resolve the embedded font-family name for a weight + language. */
export function fontFamily(weight: FontWeightKey, language: Language): string {
  return language === Language.BN ? HIND[weight] : INTER[weight];
}

/** Map a numeric/string RN fontWeight to our weight key (for legacy callers). */
export function weightKeyFromValue(
  value: string | number | undefined,
): FontWeightKey {
  switch (String(value)) {
    case '800':
    case '900':
      return 'extrabold';
    case '700':
      return 'bold';
    case '600':
      return 'semibold';
    case '500':
      return 'medium';
    default:
      return 'regular';
  }
}

/**
 * Type ramp — size + lineHeight + weight key. Weight is applied via `fontFamily`
 * in the `Text` primitive (not bare `fontWeight`) so the embedded weight loads.
 * Hierarchy leans on weight + color per AGENTS §9.2, not many sizes.
 */
export type TextVariant =
  | 'displayLg'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'body'
  | 'bodySm'
  | 'caption'
  | 'button'
  | 'label';

export const typeScale: Record<
  TextVariant,
  { fontSize: number; lineHeight: number; weight: FontWeightKey; letterSpacing?: number }
> = {
  displayLg: { fontSize: 36, lineHeight: 44, weight: 'extrabold', letterSpacing: -0.5 },
  h1: { fontSize: 28, lineHeight: 36, weight: 'bold', letterSpacing: -0.3 },
  h2: { fontSize: 22, lineHeight: 28, weight: 'bold' },
  h3: { fontSize: 18, lineHeight: 24, weight: 'semibold' },
  body: { fontSize: 16, lineHeight: 24, weight: 'regular' },
  bodySm: { fontSize: 14, lineHeight: 20, weight: 'regular' },
  caption: { fontSize: 12, lineHeight: 16, weight: 'regular' },
  button: { fontSize: 15, lineHeight: 24, weight: 'semibold', letterSpacing: 0.2 },
  label: { fontSize: 13, lineHeight: 18, weight: 'semibold' },
};
