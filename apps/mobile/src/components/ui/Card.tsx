import React from 'react';
import { StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

export interface CardProps extends ViewProps {
  /** Inner padding: true → 16, false → 0, or an explicit number. */
  pad?: boolean | number;
  style?: ViewStyle;
  children?: React.ReactNode;
}

/**
 * F5 — `Card` primitive.
 *
 * Solid elevated surface for lists and dense data (Fork 6 / spec §5.2). Radius 16,
 * continuous corners, hairline border, plus a soft shadow on light (shadows are
 * invisible on dark, so dark is border-led). RN 0.74 lacks the CSS `boxShadow`
 * style, so we use legacy shadow props here in the DS layer.
 */
export function Card({ pad = true, style, children, ...rest }: CardProps) {
  const { tokens, radii, name } = useTheme();
  const padding = pad === true ? 16 : pad === false ? 0 : pad;

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: tokens.surface,
          borderColor: tokens.border,
          borderRadius: radii.card,
          padding,
        },
        name === 'light' ? styles.shadow : null,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderCurve: 'continuous',
  },
  shadow: {
    shadowColor: '#0F1222',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
});
