import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';
import type { LucideIcon } from './icons';

export type BannerTone = 'info' | 'warn' | 'error' | 'success';

export interface BannerProps {
  tone?: BannerTone;
  icon?: LucideIcon;
  /** Localized string content. */
  children: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
}

/**
 * F5 — `Banner` primitive.
 *
 * Inline status strip (spec §5.2) for auth errors, shop-status, low-balance and
 * the app-wide offline message. Tinted via the active theme's tone styles.
 */
export function Banner({ tone = 'info', icon: Icon, children, style, testID }: BannerProps) {
  const { tones } = useTheme();
  const t = tones[tone];

  return (
    <View
      style={[styles.banner, { backgroundColor: t.bg }, style]}
      accessibilityRole="alert"
      testID={testID}
    >
      {Icon ? <Icon size={18} color={t.fg} /> : null}
      <Text variant="bodySm" style={[styles.text, { color: t.fg }]}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderCurve: 'continuous',
  },
  text: { flex: 1 },
});
