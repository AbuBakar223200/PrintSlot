import React, { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { radii, spacing, useThemeTokens } from '@/theme';
import { Text } from '@/components/ui';
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
  const tokens = useThemeTokens();

  const handlePress = useCallback(() => {
    onPress(id);
  }, [id, onPress]);

  const timeRange = useMemo(() => {
    if (startTime && endTime) {
      return `${startTime} – ${endTime}`;
    }

    return slotPickerText(slotPickerKeys.unknownTime);
  }, [endTime, startTime]);

  const remainingLabel = slotPickerText(slotPickerKeys.remaining, { count: remaining });

  return (
    <Pressable
      accessibilityLabel={`${timeRange}, ${remainingLabel}`}
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
      testID={`slot-picker-slot-${id}`}
    >
      <View style={styles.content}>
        <Text variant="body" color={selected ? 'onPrimary' : 'textPrimary'} style={styles.time}>
          {timeRange}
        </Text>
        <Text
          variant="bodySm"
          color={selected ? 'onPrimary' : 'textSecondary'}
          style={selected ? styles.selectedRemaining : undefined}
        >
          {remainingLabel}
        </Text>
      </View>
    </Pressable>
  );
}

export const SlotChip = memo(SlotChipComponent);

const styles = StyleSheet.create({
  root: {
    borderCurve: 'continuous',
    borderRadius: radii.control,
    borderWidth: 1,
    marginRight: spacing.md,
    minHeight: 76,
    minWidth: 136,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  content: {
    gap: spacing.xs,
  },
  time: {
    fontWeight: '700',
  },
  selectedRemaining: {
    fontWeight: '700',
  },
});
