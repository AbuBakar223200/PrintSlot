import React from 'react';
import {
  Platform,
  StyleSheet,
  View,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/theme';

export interface FrostCardProps extends ViewProps {
  pad?: boolean | number;
  style?: ViewStyle;
  children?: React.ReactNode;
}

/**
 * F5 — `FrostCard` primitive.
 *
 * The frosted hero surface (Fork 6 / spec §5.2) — one per screen, hero zones only.
 * Real `expo-blur` on iOS; a solid "fake frost" token (`surfaceFrost`) elsewhere
 * for cost on low-end Android. The `surfaceFrost` opacity floor keeps body text
 * clearing AA against the blended result (tokens.ts / spec §3).
 */
export function FrostCard({ pad = true, style, children, ...rest }: FrostCardProps) {
  const { tokens, radii, name } = useTheme();
  const padding = pad === true ? 16 : pad === false ? 0 : pad;

  const frame: ViewStyle = {
    borderColor: tokens.border,
    borderRadius: radii.card,
  };

  if (Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={32}
        tint={name === 'dark' ? 'dark' : 'light'}
        style={[styles.base, frame, style]}
        {...rest}
      >
        <View style={[styles.tint, { backgroundColor: tokens.surfaceFrost, padding }]}>
          {children}
        </View>
      </BlurView>
    );
  }

  return (
    <View
      style={[styles.base, frame, { backgroundColor: tokens.surfaceFrost, padding }, style]}
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
    overflow: 'hidden',
  },
  tint: { flex: 0 },
});
