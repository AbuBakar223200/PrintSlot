import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { radii, spacing, useThemeTokens } from '@/theme';
import { Text } from '@/components/ui';

export interface DateChipProps {
  date: string;
  dayOfMonth: string;
  label: string;
  selected: boolean;
  onPress: (date: string) => void;
  testID?: string;
}

function DateChipComponent({
  date,
  dayOfMonth,
  label,
  selected,
  onPress,
  testID,
}: DateChipProps) {
  const tokens = useThemeTokens();

  const handlePress = useCallback(() => {
    onPress(date);
  }, [date, onPress]);

  return (
    <Pressable
      accessibilityLabel={`${label} ${dayOfMonth}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      android_ripple={{ color: tokens.border }}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.root,
        { backgroundColor: tokens.surface, borderColor: tokens.border },
        selected ? { backgroundColor: tokens.primary, borderColor: tokens.primary } : null,
        pressed ? styles.pressed : null,
      ]}
      testID={testID}
    >
      <View style={styles.content}>
        <Text
          variant="caption"
          color={selected ? 'onPrimary' : 'textSecondary'}
          style={styles.label}
        >
          {label}
        </Text>
        <Text variant="h3" color={selected ? 'onPrimary' : 'textPrimary'}>
          {dayOfMonth}
        </Text>
      </View>
    </Pressable>
  );
}

export const DateChip = memo(DateChipComponent);

const styles = StyleSheet.create({
  root: {
    borderCurve: 'continuous',
    borderRadius: radii.control,
    borderWidth: 1,
    flex: 1,
    minHeight: 72,
    minWidth: 68,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  content: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    fontWeight: '600',
  },
});
