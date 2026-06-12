import React, { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useThemeTokens } from '@/theme';

export interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel?: string;
}

/**
 * F5 — `Switch` primitive. Token-driven toggle; the knob translates (transform
 * only, §6).
 */
export function Switch({ value, onValueChange, accessibilityLabel }: SwitchProps) {
  const tokens = useThemeTokens();
  const p = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    p.value = withTiming(value ? 1 : 0, { duration: 180 });
  }, [value, p]);

  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: 3 + p.value * 18 }] }));

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
      style={[styles.track, { backgroundColor: value ? tokens.primary : tokens.border }]}
    >
      <Animated.View style={[styles.knob, knob]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: 46, height: 28, borderRadius: 9999, justifyContent: 'center' },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF' },
});
