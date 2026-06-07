import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { borderRadius, colors, spacing, typography } from '@/config/theme';

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
  const handlePress = useCallback(() => {
    onPress(date);
  }, [date, onPress]);

  return (
    <Pressable
      accessibilityLabel={`${label} ${dayOfMonth}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      android_ripple={{ color: colors.borderLight }}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.root,
        selected ? styles.selected : null,
        pressed ? styles.pressed : null,
      ]}
      testID={testID}
    >
      <View style={styles.content}>
        <Text style={[styles.label, selected ? styles.selectedText : null]}>
          {label}
        </Text>
        <Text style={[styles.day, selected ? styles.selectedText : null]}>
          {dayOfMonth}
        </Text>
      </View>
    </Pressable>
  );
}

export const DateChip = memo(DateChipComponent);

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderCurve: 'continuous',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flex: 1,
    minHeight: 72,
    minWidth: 68,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  selected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
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
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  day: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  selectedText: {
    color: colors.textInverse,
  },
});
