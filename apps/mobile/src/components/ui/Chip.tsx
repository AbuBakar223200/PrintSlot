import React from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { useThemeTokens } from '@/theme';
import { Text } from './Text';

export interface ChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

/**
 * F5 — `Chip` primitive. Selectable/filter pill (date chips, list filters).
 */
export function Chip({ label, active = false, onPress, style }: ChipProps) {
  const tokens = useThemeTokens();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: active ? tokens.primary : tokens.tintSoft },
        pressed && !active ? styles.pressed : null,
        style,
      ]}
    >
      <Text variant="label" style={{ color: active ? tokens.onPrimary : tokens.textSecondary }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    borderCurve: 'continuous',
  },
  pressed: { opacity: 0.7 },
});
