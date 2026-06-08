import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import type { Slot } from '@printslot/shared';
import { Button, ButtonText } from '@/components/ui/Button';
import { borderRadius, colors, spacing, typography } from '@/config/theme';
import { DateChip } from '@/features/slots/components/DateChip';
import { SlotChip } from '@/features/slots/components/SlotChip';
import { useShopSlots } from '@/features/slots/hooks/useShopSlots';
import {
  slotPickerKeys,
  slotPickerText,
  weekdayShortKey,
} from '@/features/slots/i18n/slotPickerCopy';
import { formatLocalDate, getDateChipOptions } from '@/utils/formatDate';

export interface SlotPickerProps {
  shopId: string;
  value: string | null;
  onChange: (slotId: string) => void;
}

const EMPTY_SLOTS: Slot[] = [];
const LOADING_CHIPS = ['slot-skeleton-1', 'slot-skeleton-2', 'slot-skeleton-3'];

export function SlotPicker({ shopId, value, onChange }: SlotPickerProps) {
  const dateOptions = useMemo(() => getDateChipOptions(4), []);
  const [selectedDate, setSelectedDate] = useState(() => (
    dateOptions[0]?.date ?? formatLocalDate(new Date())
  ));
  const { data, isError, isLoading, refetch } = useShopSlots(shopId, selectedDate);
  const slots = data ?? EMPTY_SLOTS;

  const selectDate = useCallback((date: string) => {
    setSelectedDate(date);
  }, []);

  const retry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const keyExtractor = useCallback((item: Slot) => item.id, []);

  const renderSlot = useCallback(({ item }: { item: Slot }) => {
    const remaining = Math.max(item.maxOrders - item.currentCount, 0);

    return (
      <SlotChip
        endTime={item.template?.endTime ?? null}
        id={item.id}
        onPress={onChange}
        remaining={remaining}
        selected={item.id === value}
        startTime={item.template?.startTime ?? null}
      />
    );
  }, [onChange, value]);

  const retryLabel = slotPickerText(slotPickerKeys.retry);

  return (
    <View style={styles.root}>
      <View style={styles.dateRow}>
        {dateOptions.map((option) => {
          const label = option.isToday
            ? slotPickerText(slotPickerKeys.today)
            : slotPickerText(weekdayShortKey(option.weekdayIndex));

          return (
            <DateChip
              date={option.date}
              dayOfMonth={option.dayOfMonth}
              key={option.date}
              label={label}
              onPress={selectDate}
              selected={selectedDate === option.date}
              testID={`slot-picker-date-${option.date}`}
            />
          );
        })}
      </View>

      {isLoading ? (
        <View
          accessibilityLabel={slotPickerText(slotPickerKeys.loading)}
          accessibilityRole="progressbar"
          style={styles.loadingRow}
          testID="slot-picker-loading"
        >
          {LOADING_CHIPS.map((id) => (
            <View key={id} style={styles.loadingChip} testID="slot-picker-loading-chip" />
          ))}
        </View>
      ) : null}

      {!isLoading && isError ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateTitle}>{slotPickerText(slotPickerKeys.errorTitle)}</Text>
          <Text style={styles.stateText}>{slotPickerText(slotPickerKeys.errorBody)}</Text>
          <Button onPress={retry} size="sm" testID="slot-picker-retry-button">
            <ButtonText>{retryLabel}</ButtonText>
          </Button>
        </View>
      ) : null}

      {!isLoading && !isError && slots.length === 0 ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateText}>{slotPickerText(slotPickerKeys.noSlots)}</Text>
        </View>
      ) : null}

      {!isLoading && !isError && slots.length > 0 ? (
        <View style={styles.slotList}>
          <FlashList
            contentContainerStyle={styles.slotListContent}
            data={slots}
            estimatedItemSize={148}
            extraData={value}
            horizontal
            keyExtractor={keyExtractor}
            renderItem={renderSlot}
            showsHorizontalScrollIndicator={false}
            testID="slot-picker-slot-list"
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.lg,
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  loadingRow: {
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 76,
  },
  loadingChip: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderCurve: 'continuous',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    minHeight: 76,
    width: 136,
  },
  stateBox: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderCurve: 'continuous',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  stateTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  stateText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  slotList: {
    minHeight: 84,
  },
  slotListContent: {
    paddingRight: spacing.md,
  },
});
