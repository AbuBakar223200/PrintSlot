import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CalendarClock, ClipboardList, ListOrdered } from 'lucide-react-native';
import { PickupMode } from '@printslot/shared';
import { Avatar, Card, EmptyState, Screen, Skeleton, Text } from '@/components/ui';
import { OwnerTabBar, OWNER_TAB_BAR_HEIGHT } from '@/components/shared/OwnerTabBar';
import { JobRow } from '@/features/staff/components/JobRow';
import type { StaffJob } from '@/features/staff/services/staffJobService';
import { useOwnerShop } from '@/features/owner/hooks/useOwnerShop';
import { useOwnerJobs } from '@/features/owner/hooks/useOwnerJobs';
import { spacing, useThemeTokens } from '@/theme';
import type { LucideIcon } from '@/components/ui/icons';

const SKELETON_ROWS = ['j1', 'j2', 'j3'];

type Section = { type: 'section'; key: string; labelKey: string; icon: LucideIcon };
type Empty = { type: 'empty'; key: string };
type Row = { type: 'job'; key: string; job: StaffJob };
type ListItem = Section | Empty | Row;

export default function OwnerJobsScreen() {
  const { t } = useTranslation();
  const { data: shop } = useOwnerShop();
  const shopId = shop?.id ?? null;
  const { data, isError, isLoading, isRefetching, refetch } = useOwnerJobs(shopId);
  const jobs = data ?? [];

  const openProfile = useCallback(() => {
    router.push('/(owner)/profile' as never);
  }, []);

  const openJob = useCallback((orderId: string) => {
    // Owners reuse the staff job-detail screen (same shop queue, same hooks).
    router.push(`/(staff)/jobs/${orderId}` as never);
  }, []);

  const retry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const listData = useMemo<ListItem[]>(() => {
    const slot = jobs.filter((j) => j.pickupMode === PickupMode.SLOT);
    const queue = jobs.filter((j) => j.pickupMode === PickupMode.QUEUE);
    const items: ListItem[] = [];

    items.push({ type: 'section', key: 'sec-slot', labelKey: 'staff.slotJobs', icon: CalendarClock });
    if (slot.length > 0) {
      for (const job of slot) items.push({ type: 'job', key: job.id, job });
    } else {
      items.push({ type: 'empty', key: 'empty-slot' });
    }

    items.push({ type: 'section', key: 'sec-queue', labelKey: 'staff.queueJobs', icon: ListOrdered });
    if (queue.length > 0) {
      for (const job of queue) items.push({ type: 'job', key: job.id, job });
    } else {
      items.push({ type: 'empty', key: 'empty-queue' });
    }

    return items;
  }, [jobs]);

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    if (item.type === 'section') return <SectionHeader labelKey={item.labelKey} icon={item.icon} />;
    if (item.type === 'empty') return <EmptyRow />;
    return <JobRow job={item.job} onPress={openJob} />;
  }, [openJob]);

  if (isLoading) {
    return (
      <View style={styles.root}>
        <Screen contentContainerStyle={styles.content}>
          <Header shopName={shop?.name ?? null} onProfile={openProfile} />
          <View style={styles.skeletonList}>
            {SKELETON_ROWS.map((id) => (
              <Card key={id} style={styles.skeletonCard}>
                <Skeleton width="45%" height={16} />
                <Skeleton width="70%" height={12} />
              </Card>
            ))}
          </View>
        </Screen>
        <OwnerTabBar active="jobs" />
      </View>
    );
  }

  if (isError && jobs.length === 0) {
    return (
      <View style={styles.root}>
        <Screen contentContainerStyle={styles.centerContent}>
          <EmptyState
            icon={ClipboardList}
            title={t('staff.empty')}
            body={t('staff.emptySub')}
            cta={{ label: t('common.retry'), onPress: retry }}
          />
        </Screen>
        <OwnerTabBar active="jobs" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Screen scroll={false}>
        <FlashList
          contentContainerStyle={styles.listContent}
          data={jobs.length === 0 ? [] : listData}
          estimatedItemSize={92}
          keyExtractor={(item) => item.key}
          ItemSeparatorComponent={Separator}
          ListEmptyComponent={(
            <EmptyState icon={ClipboardList} title={t('staff.empty')} body={t('staff.emptySub')} />
          )}
          ListHeaderComponent={<Header shopName={shop?.name ?? null} onProfile={openProfile} />}
          onRefresh={retry}
          refreshing={isRefetching && !isLoading}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      </Screen>
      <OwnerTabBar active="jobs" />
    </View>
  );
}

function Header({ shopName, onProfile }: { shopName: string | null; onProfile: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.header}>
      <View style={styles.grow}>
        <Text variant="h1" color="textPrimary">{t('staff.jobsTitle')}</Text>
      </View>
      <Pressable
        accessibilityLabel={t('tab.profile')}
        accessibilityRole="button"
        hitSlop={8}
        onPress={onProfile}
        testID="owner-jobs-profile-button"
      >
        <Avatar name={shopName ?? 'Shop'} size="md" />
      </Pressable>
    </View>
  );
}

function SectionHeader({ labelKey, icon: Icon }: { labelKey: string; icon: LucideIcon }) {
  const tokens = useThemeTokens();
  const { t } = useTranslation();
  return (
    <View style={styles.sectionHeader}>
      <Icon size={16} color={tokens.textPrimary} />
      <Text variant="h3" color="textPrimary">{t(labelKey)}</Text>
    </View>
  );
}

function EmptyRow() {
  return (
    <Text variant="body" color="textMuted" style={styles.emptyRow}>
      —
    </Text>
  );
}

function Separator() {
  return <View style={styles.separator} />;
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
  centerContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    paddingBottom: OWNER_TAB_BAR_HEIGHT + spacing.lg,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: OWNER_TAB_BAR_HEIGHT + spacing.lg,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  grow: {
    flex: 1,
    gap: 2,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  emptyRow: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  skeletonList: {
    gap: spacing.md,
  },
  skeletonCard: {
    gap: spacing.sm,
  },
  separator: {
    height: spacing.md,
  },
});
