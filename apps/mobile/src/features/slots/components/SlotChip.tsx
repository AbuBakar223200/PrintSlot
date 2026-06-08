import React, { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { borderRadius, colors, spacing, typography } from '@/config/theme';
import { slotPickerKeys, slotPickerText } from '@/features/slots/i18n/slotPickerCopy';

export interface SlotChipProps {
  id: string;
  startTime: string | null;
  endTime: string | null;
  remaining: number;
  selected: boolean;
  onPress: (slotId: string) => void;
}

function SlotChipComponent({
  id,
  startTime,
  endTime,
  remaining,
  selected,
  onPress,
}: SlotChipProps) {
  const handlePress = useCallback(() => {
    onPress(id);
  }, [id, onPress]);

  const timeRange = useMemo(() => {
    if (startTime && endTime) {
      return `${startTime} \u2013 ${endTime}`;
    }

    return slotPickerText(slotPickerKeys.unknownTime);
  }, [endTime, startTime]);

  const remainingLabel = slotPickerText(slotPickerKeys.remaining, { count: remaining });

  return (
    <Pressable
      accessibilityLabel={`${timeRange}, ${remainingLabel}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      android_ripple={{ color: colors.borderLight }}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.root,
        selected ? styles.selected : null,
        pressed ? styles.pressed : null,
      ]}
      testID={`slot-picker-slot-${id}`}
    >
      <View style={styles.content}>
        <Text style={[styles.time, selected ? styles.selectedText : null]}>
          {timeRange}
        </Text>
        <Text style={[styles.remaining, selected ? styles.selectedRemaining : null]}>
          {remainingLabel}
        </Text>
      </View>
    </Pressable>
  );
}

export const SlotChip = memo(SlotChipComponent);

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderCurve: 'continuous',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginRight: spacing.md,
    minHeight: 76,
    minWidth: 136,
    paddingHorizontal: spacing.lg,
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
    gap: spacing.xs,
  },
  time: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  remaining: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  selectedText: {
    color: colors.textInverse,
  },
  selectedRemaining: {
    color: colors.textInverse,
    fontWeight: '700',
  },
});
