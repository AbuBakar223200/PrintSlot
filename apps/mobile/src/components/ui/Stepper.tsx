import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { useThemeTokens } from '@/theme';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import { localizeDigits } from '@/i18n/format';
import { Text } from './Text';

export interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

/**
 * F5 — `Stepper` primitive. Numeric +/- control (copies, maxOrders) with a min
 * bound. Value renders in Bengali numerals in BN mode (Fork 11).
 */
export function Stepper({ value, onChange, min = 1, max = Number.MAX_SAFE_INTEGER, step = 1 }: StepperProps) {
  const tokens = useThemeTokens();
  const language = useSettingsStore((s) => s.language);
  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <View style={[styles.wrap, { borderColor: tokens.border, backgroundColor: tokens.surface }]}>
      <Pressable
        onPress={() => onChange(Math.max(min, value - step))}
        disabled={atMin}
        accessibilityRole="button"
        accessibilityLabel="Decrease"
        style={styles.btn}
      >
        <Minus size={16} color={atMin ? tokens.textMuted : tokens.textPrimary} />
      </Pressable>
      <Text variant="button" tabular style={styles.val}>
        {localizeDigits(value, language)}
      </Text>
      <Pressable
        onPress={() => onChange(Math.min(max, value + step))}
        disabled={atMax}
        accessibilityRole="button"
        accessibilityLabel="Increase"
        style={styles.btn}
      >
        <Plus size={16} color={atMax ? tokens.textMuted : tokens.textPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  btn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  val: { minWidth: 34, textAlign: 'center' },
});
