import React from 'react';
import {
  Text as RNText,
  StyleSheet,
  type TextProps as RNTextProps,
  type TextStyle,
} from 'react-native';
import { Language } from '@printslot/shared';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import { useThemeTokens } from '@/theme';
import { fontFamily, typeScale, type TextVariant } from '@/theme/fonts';
import type { ThemeTokens } from '@/theme/tokens';

/** Color tokens that text may use (subset of ThemeTokens that read as colors). */
export type TextColorToken =
  | 'textPrimary'
  | 'textSecondary'
  | 'textMuted'
  | 'primary'
  | 'onPrimary'
  | 'success'
  | 'warn'
  | 'error'
  | 'info'
  | 'violet';

export interface TextProps extends RNTextProps {
  /** Type-ramp variant (size + line-height + weight). Defaults to `body`. */
  variant?: TextVariant;
  /** Semantic color token. Defaults to `textPrimary`. */
  color?: TextColorToken;
  /**
   * Tabular figures — fixed-width digits so money/counters don't jitter as
   * digits change (Fork 4). Default on for `MoneyText`; opt-in here.
   */
  tabular?: boolean;
  /** Convenience text-align passthrough. */
  align?: TextStyle['textAlign'];
  children?: React.ReactNode;
}

/**
 * F2 — `Text` primitive.
 *
 * The only text component app code should use. Selects the embedded font family
 * by active language (Inter for EN, Hind Siliguri for BN — Fork 11), applies the
 * type ramp, resolves color from semantic tokens, and supports tabular figures.
 *
 * Dynamic-type scaling is capped at ~1.3× (Fork 13) via `maxFontSizeMultiplier`.
 */
export function Text({
  variant = 'body',
  color = 'textPrimary',
  tabular = false,
  align,
  style,
  maxFontSizeMultiplier = 1.3,
  children,
  ...rest
}: TextProps) {
  const tokens = useThemeTokens();
  const language = useSettingsStore((s) => s.language);

  const ramp = typeScale[variant];
  const resolvedColor = (tokens as ThemeTokens)[color];

  const composed: TextStyle = {
    fontFamily: fontFamily(ramp.weight, language),
    fontSize: ramp.fontSize,
    lineHeight: ramp.lineHeight,
    letterSpacing: ramp.letterSpacing,
    color: resolvedColor,
    textAlign: align,
  };

  return (
    <RNText
      style={[composed, tabular ? styles.tabular : null, style]}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      allowFontScaling
      {...rest}
    >
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  tabular: {
    // Fixed-width digits — money values stay aligned as they tick (Fork 4 / §6).
    fontVariant: ['tabular-nums'],
  },
});
