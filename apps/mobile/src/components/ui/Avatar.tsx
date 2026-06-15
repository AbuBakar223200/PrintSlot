import React from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeTokens } from '@/theme';
import { Text } from './Text';
import type { TextVariant } from '@/theme/fonts';

const SIZES = { sm: 34, md: 42, lg: 72 } as const;
const VARIANT: Record<keyof typeof SIZES, TextVariant> = { sm: 'bodySm', md: 'h3', lg: 'h1' };

export interface AvatarProps {
  /** Full name → initials. Ignored if `initials` is given. */
  name?: string;
  initials?: string;
  size?: keyof typeof SIZES;
  /** Rounded square (shop tiles) instead of a circle. */
  rounded?: boolean;
  style?: ViewStyle;
}

function toInitials(name?: string): string {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/**
 * F5 — `Avatar` primitive. User/shop initial on the indigo→violet brand gradient.
 */
export function Avatar({ name, initials, size = 'md', rounded, style }: AvatarProps) {
  const tokens = useThemeTokens();
  const dim = SIZES[size];
  const label = initials ?? toInitials(name);

  return (
    <LinearGradient
      colors={[tokens.primary, tokens.violet]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.center,
        { width: dim, height: dim, borderRadius: rounded ? 12 : dim / 2 },
        style,
      ]}
    >
      <Text variant={VARIANT[size]} style={{ color: tokens.onPrimary }}>
        {label}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous' },
});
