import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Store } from 'lucide-react-native';
import { ShopStatus, type Shop } from '@printslot/shared';
import {
  Avatar,
  Card,
  EmptyState,
  Screen,
  SegmentedControl,
  Skeleton,
  Text,
  toast,
} from '@/components/ui';
import { AdminTabBar, ADMIN_TAB_BAR_HEIGHT } from '@/components/shared/AdminTabBar';
import { spacing } from '@/theme';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { AdminShopCard } from '@/features/admin/components/AdminShopCard';
import { RejectShopSheet } from '@/features/admin/components/RejectShopSheet';
import { useAdminShops, useUpdateShopStatus } from '@/features/admin/hooks/useAdminShops';

type ShopFilter = 'PENDING' | 'ALL';

const SKELETON_ROWS = ['s1', 's2', 's3'];

export default function AdminShopsScreen() {
  const { t } = useTranslation();
  const adminName = useAuthStore((s) => s.user?.name ?? 'Platform Admin');
  const { data, isLoading, isError, isRefetching, refetch } = useAdminShops();
  const updateStatus = useUpdateShopStatus();

  const [filter, setFilter] = useState<ShopFilter>('PENDING');
  const [rejectShopId, setRejectShopId] = useState<string | null>(null);

  const shops = useMemo(() => {
    const all = data ?? [];
    return filter === 'PENDING' ? all.filter((s) => s.status === ShopStatus.PENDING) : all;
  }, [data, filter]);

  const openProfile = useCallback(() => {
    router.push('/(admin)/profile' as never);
  }, []);

  const onApprove = useCallback(
    (shopId: string) => {
      updateStatus.mutate(
        { shopId, status: ShopStatus.ACTIVE },
        { onSuccess: () => toast(t('toast.approved'), { tone: 'success' }) },
      );
    },
    [t, updateStatus],
  );

  const onReinstate = useCallback(
    (shopId: string) => {
      updateStatus.mutate(
        { shopId, status: ShopStatus.ACTIVE },
        { onSuccess: () => toast(t('toast.reinstated'), { tone: 'success' }) },
      );
    },
    [t, updateStatus],
  );

  const onSuspend = useCallback(
    (shopId: string) => {
      updateStatus.mutate(
        { shopId, status: ShopStatus.SUSPENDED },
        { onSuccess: () => toast(t('toast.suspended'), { tone: 'info' }) },
      );
    },
    [t, updateStatus],
  );

  const onReject = useCallback((shopId: string) => {
    setRejectShopId(shopId);
  }, []);

  const submitReject = useCallback(
    (reason: string) => {
      if (!rejectShopId) return;
      updateStatus.mutate(
        { shopId: rejectShopId, status: ShopStatus.REJECTED, rejectionReason: reason },
        {
          onSuccess: () => {
            setRejectShopId(null);
            toast(t('toast.rejected'), { tone: 'error' });
          },
        },
      );
    },
    [rejectShopId, t, updateStatus],
  );

  const renderShop = useCallback(
    ({ item }: { item: Shop }) => (
      <AdminShopCard
        shop={item}
        onApprove={onApprove}
        onSuspend={onSuspend}
        onReinstate={onReinstate}
        onReject={onReject}
      />
    ),
    [onApprove, onReinstate, onReject, onSuspend],
  );

  const segmentOptions = useMemo(
    () => [
      { value: 'PENDING' as const, label: t('admin.pending') },
      { value: 'ALL' as const, label: t('admin.all') },
    ],
    [t],
  );

  const header = (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <View style={styles.grow}>
          <Text variant="h1" color="textPrimary">{t('admin.shopsTitle')}</Text>
        </View>
        <Pressable
          accessibilityLabel={t('tab.profile')}
          accessibilityRole="button"
          hitSlop={8}
          onPress={openProfile}
          testID="admin-shops-profile-button"
        >
          <Avatar name={adminName} size="md" />
        </Pressable>
      </View>
      <SegmentedControl<ShopFilter>
        options={segmentOptions}
        value={filter}
        onChange={setFilter}
      />
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.root}>
        <Screen contentContainerStyle={styles.content}>
          {header}
          {SKELETON_ROWS.map((id) => (
            <Card key={id} style={styles.skeletonCard}>
              <Skeleton width="55%" height={18} />
              <Skeleton width="80%" height={12} />
              <Skeleton width="100%" height={40} />
            </Card>
          ))}
        </Screen>
        <AdminTabBar active="shops" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.root}>
        <Screen contentContainerStyle={styles.content}>
          {header}
          <EmptyState
            icon={Store}
            title={t('shops.empty')}
            body={t('notif.emptySub')}
            cta={{ label: t('common.retry'), onPress: () => void refetch() }}
          />
        </Screen>
        <AdminTabBar active="shops" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Screen scroll={false}>
        <FlashList
          contentContainerStyle={styles.listContent}
          data={shops}
          estimatedItemSize={140}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={Separator}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <EmptyState icon={Store} title={t('shops.empty')} body={t('notif.emptySub')} />
          }
          onRefresh={() => void refetch()}
          refreshing={isRefetching && !isLoading}
          renderItem={renderShop}
          showsVerticalScrollIndicator={false}
        />
      </Screen>
      <AdminTabBar active="shops" />
      <RejectShopSheet
        visible={rejectShopId !== null}
        onClose={() => setRejectShopId(null)}
        onSubmit={submitReject}
        isSubmitting={updateStatus.isPending}
      />
    </View>
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
    paddingBottom: ADMIN_TAB_BAR_HEIGHT + spacing.lg,
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: ADMIN_TAB_BAR_HEIGHT + spacing.lg,
  },
  header: {
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  grow: {
    flex: 1,
  },
  skeletonCard: {
    gap: spacing.sm,
  },
  separator: {
    height: spacing.md,
  },
});
