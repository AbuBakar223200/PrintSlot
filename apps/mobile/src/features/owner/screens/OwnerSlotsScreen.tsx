import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CalendarClock } from 'lucide-react-native';
import {
  Avatar,
  Card,
  Chip,
  EmptyState,
  Screen,
  Skeleton,
  Text,
  toast,
} from '@/components/ui';
import { OwnerTabBar, OWNER_TAB_BAR_HEIGHT } from '@/components/shared/OwnerTabBar';
import { spacing } from '@/theme';
import { localizeDigits } from '@/i18n/format';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import { OwnerSlotCard } from '@/features/owner/components/OwnerSlotCard';
import { buildSlotDateOptions } from '@/features/owner/dateOptions';
import { useOwnerShop } from '@/features/owner/hooks/useOwnerShop';
import { useOwnerSlots, useUpsertSlot } from '@/features/owner/hooks/useOwnerSlots';
import type { ManagedSlot } from '@/features/owner/services/ownerSlotsService';

const SKELETON_ROWS = ['s1', 's2', 's3', 's4'];

export default function OwnerSlotsScreen() {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const { data: shop } = useOwnerShop();
  const shopId = shop?.id ?? null;

  const dateOptions = useMemo(() => buildSlotDateOptions(), []);
  const [activeOffset, setActiveOffset] = useState(0);
  const activeDate = dateOptions.find((d) => d.offset === activeOffset) ?? dateOptions[0];

  const { data, isLoading, isError, refetch } = useOwnerSlots(shopId, activeDate.iso);
  const upsert = useUpsertSlot();
  const slots = data ?? [];

  const openProfile = useCallback(() => {
    router.push('/(owner)/profile' as never);
  }, []);

  const dateLabel = useCallback(
    (offset: number) => (offset === 0 ? t('wizard.today') : `+${localizeDigits(offset, language)}`),
    [language, t],
  );

  const onToggleOpen = useCallback(
    (templateId: string, isOpen: boolean) => {
      if (!shopId) return;
      const current = slots.find((s) => s.templateId === templateId);
      const maxOrders = current?.maxOrders ?? 10;
      upsert.mutate(
        { shopId, templateId, date: activeDate.iso, isOpen, maxOrders },
        { onSuccess: () => toast(t('toast.slotUpdated'), { tone: 'success' }) },
      );
    },
    [activeDate.iso, shopId, slots, t, upsert],
  );

  const onChangeMax = useCallback(
    (templateId: string, maxOrders: number) => {
      if (!shopId) return;
      const current = slots.find((s) => s.templateId === templateId);
      const isOpen = current?.isOpen ?? false;
      upsert.mutate({ shopId, templateId, date: activeDate.iso, isOpen, maxOrders });
    },
    [activeDate.iso, shopId, slots, upsert],
  );

  return (
    <View style={styles.root}>
      <Screen contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.grow}>
            <Text variant="h1" color="textPrimary">{t('owner.slotsTitle')}</Text>
          </View>
          <Pressable
            accessibilityLabel={t('tab.profile')}
            accessibilityRole="button"
            hitSlop={8}
            onPress={openProfile}
            testID="owner-slots-profile-button"
          >
            <Avatar name={shop?.name ?? 'Shop'} size="md" />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateChips}
        >
          {dateOptions.map((option) => (
            <Chip
              key={option.iso}
              label={dateLabel(option.offset)}
              active={option.offset === activeOffset}
              onPress={() => setActiveOffset(option.offset)}
            />
          ))}
        </ScrollView>

        {isLoading ? (
          <View style={styles.list}>
            {SKELETON_ROWS.map((id) => (
              <Card key={id} style={styles.skeletonCard}>
                <Skeleton width="40%" height={18} />
                <Skeleton width="100%" height={40} />
              </Card>
            ))}
          </View>
        ) : isError ? (
          <EmptyState
            icon={CalendarClock}
            title={t('owner.slotsTitle')}
            body={t('staff.emptySub')}
            cta={{ label: t('common.retry'), onPress: () => void refetch() }}
          />
        ) : slots.length === 0 ? (
          <EmptyState icon={CalendarClock} title={t('owner.slotsTitle')} body={t('staff.emptySub')} />
        ) : (
          <View style={styles.list}>
            {slots.map((slot: ManagedSlot) => (
              <OwnerSlotCard
                key={slot.templateId}
                slot={slot}
                onToggleOpen={onToggleOpen}
                onChangeMax={onChangeMax}
              />
            ))}
          </View>
        )}
      </Screen>
      <OwnerTabBar active="slots" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: OWNER_TAB_BAR_HEIGHT + spacing.lg,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  grow: {
    flex: 1,
  },
  dateChips: {
    gap: spacing.sm,
  },
  list: {
    gap: spacing.md,
  },
  skeletonCard: {
    gap: spacing.md,
  },
});
