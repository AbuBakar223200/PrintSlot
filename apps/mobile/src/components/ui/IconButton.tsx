import React from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { useThemeTokens } from '@/theme';
import type { LucideIcon } from './icons';

export interface IconButtonProps {
  icon: LucideIcon;
  /** Required screen-reader label (Fork 13). */
  accessibilityLabel: string;
  onPress?: () => void;
  /** Glyph size (default 20). The touch target stays ≥44×44. */
  size?: number;
  color?: string;
  variant?: 'plain' | 'surface';
  style?: ViewStyle;
}

/**
 * F5 — `IconButton` primitive. A single lucide action with a ≥44×44 touch target
 * and a required a11y label.
 */
export function IconButton({
  icon: Icon,
  accessibilityLabel,
  onPress,
  size = 20,
  color,
  variant = 'plain',
  style,
}: IconButtonProps) {
  const tokens = useThemeTokens();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        variant === 'surface'
          ? { backgroundColor: tokens.surface, borderColor: tokens.border, borderWidth: 1 }
          : null,
        pressed ? styles.pressed : null,
        style,
      ]}
    >
      <Icon size={size} color={color ?? tokens.textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6, transform: [{ scale: 0.96 }] },
});
