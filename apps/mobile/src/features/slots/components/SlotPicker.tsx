import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import type { Slot } from '@printslot/shared';
import { Button, ButtonText, Text } from '@/components/ui';
import { radii, spacing, useThemeTokens } from '@/theme';
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
  const tokens = useThemeTokens();
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

  const stateBoxStyle = [
    styles.stateBox,
    { backgroundColor: tokens.surface, borderColor: tokens.border },
  ];

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
            <View
              key={id}
              style={[
                styles.loadingChip,
                { backgroundColor: tokens.skeletonBase, borderColor: tokens.border },
              ]}
              testID="slot-picker-loading-chip"
            />
          ))}
        </View>
      ) : null}

      {!isLoading && isError ? (
        <View style={stateBoxStyle}>
          <Text variant="h3" color="textPrimary" align="center">
            {slotPickerText(slotPickerKeys.errorTitle)}
          </Text>
          <Text variant="bodySm" color="textSecondary" align="center">
            {slotPickerText(slotPickerKeys.errorBody)}
          </Text>
          <Button onPress={retry} size="sm" testID="slot-picker-retry-button">
            <ButtonText>{retryLabel}</ButtonText>
          </Button>
        </View>
      ) : null}

      {!isLoading && !isError && slots.length === 0 ? (
        <View style={stateBoxStyle}>
          <Text variant="bodySm" color="textSecondary" align="center">
            {slotPickerText(slotPickerKeys.noSlots)}
          </Text>
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
    borderCurve: 'continuous',
    borderRadius: radii.control,
    borderWidth: 1,
    minHeight: 76,
    width: 136,
  },
  stateBox: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: radii.card,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  slotList: {
    minHeight: 84,
  },
  slotListContent: {
    paddingRight: spacing.md,
  },
});
