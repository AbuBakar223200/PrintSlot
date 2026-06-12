import React from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { useThemeTokens } from '@/theme';
import { Text } from './Text';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: ReadonlyArray<SegmentOption<T>>;
  value: T;
  onChange: (value: T) => void;
  style?: ViewStyle;
}

/**
 * F5 — `SegmentedControl` primitive. 2–3 option exclusive selector (role picker,
 * Language, Theme, list filters). The active segment sits on a raised surface chip.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
}: SegmentedControlProps<T>) {
  const tokens = useThemeTokens();

  return (
    <View style={[styles.track, { backgroundColor: tokens.tintSoft }, style]} accessibilityRole="tablist">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.seg, active ? { backgroundColor: tokens.surface } : null]}
          >
            <Text variant="label" style={{ color: active ? tokens.primary : tokens.textSecondary }}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: 14,
    borderCurve: 'continuous',
    padding: 3,
    gap: 2,
  },
  seg: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    borderCurve: 'continuous',
  },
});
