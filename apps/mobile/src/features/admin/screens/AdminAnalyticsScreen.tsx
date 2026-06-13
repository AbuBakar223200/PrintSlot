import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, Banknote, BarChart3, Clock, Package, Store } from 'lucide-react-native';
import {
  Avatar,
  Banner,
  Card,
  EmptyState,
  Screen,
  Skeleton,
  StatCard,
  Text,
} from '@/components/ui';
import { KeyValue } from '@/components/ui';
import { AdminTabBar, ADMIN_TAB_BAR_HEIGHT } from '@/components/shared/AdminTabBar';
import { spacing } from '@/theme';
import { formatMoney, localizeDigits } from '@/i18n/format';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { RevenueBars } from '@/features/admin/components/RevenueBars';
import { useAdminAnalytics } from '@/features/admin/hooks/useAdminAnalytics';

const SKELETON_STATS = ['a1', 'a2', 'a3', 'a4'];

export default function AdminAnalyticsScreen() {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const adminName = useAuthStore((s) => s.user?.name ?? 'Platform Admin');
  const { data, isLoading, isError, refetch } = useAdminAnalytics();

  const openProfile = useCallback(() => {
    router.push('/(admin)/profile' as never);
  }, []);

  const header = (
    <View style={styles.header}>
      <View style={styles.grow}>
        <Text variant="h1" color="textPrimary">{t('admin.analyticsTitle')}</Text>
      </View>
      <Pressable
        accessibilityLabel={t('tab.profile')}
        accessibilityRole="button"
        hitSlop={8}
        onPress={openProfile}
        testID="admin-analytics-profile-button"
      >
        <Avatar name={adminName} size="md" />
      </Pressable>
    </View>
  );

  return (
    <View style={styles.root}>
      <Screen contentContainerStyle={styles.content}>
        {header}

        {isLoading ? (
          <>
            <View style={styles.statGrid}>
              {SKELETON_STATS.map((id) => (
                <Card key={id} style={styles.statSkeleton}>
                  <Skeleton width={32} height={32} radius={10} />
                  <Skeleton width="60%" height={22} />
                  <Skeleton width="80%" height={12} />
                </Card>
              ))}
            </View>
            <Card>
              <Skeleton width="100%" height={140} />
            </Card>
          </>
        ) : isError || !data ? (
          <EmptyState
            icon={BarChart3}
            title={t('admin.analyticsTitle')}
            body={t('notif.emptySub')}
            cta={{ label: t('common.retry'), onPress: () => void refetch() }}
          />
        ) : (
          <>
            <Banner tone="info" icon={Clock}>
              {t('admin.pendingApprovals', { n: localizeDigits(data.pendingApprovals, language) })}
            </Banner>

            <View style={styles.statGrid}>
              <View style={styles.statCell}>
                <StatCard
                  index={0}
                  icon={Store}
                  label={t('admin.totalShops')}
                  value={localizeDigits(data.totalShops, language)}
                />
              </View>
              <View style={styles.statCell}>
                <StatCard
                  index={1}
                  icon={BadgeCheck}
                  label={t('admin.activeShops')}
                  value={localizeDigits(data.activeShops, language)}
                />
              </View>
              <View style={styles.statCell}>
                <StatCard
                  index={2}
                  icon={Package}
                  label={t('admin.totalOrders')}
                  value={localizeDigits(data.totalOrders, language)}
                />
              </View>
              <View style={styles.statCell}>
                <StatCard
                  index={3}
                  icon={Banknote}
                  label={t('admin.revenue')}
                  value={formatMoney(data.totalRevenue, language)}
                />
              </View>
            </View>

            <Text variant="h3" color="textPrimary">{t('admin.revenuePerShop')}</Text>

            {data.revenuePerShop.length > 0 ? (
              <>
                <Card>
                  <RevenueBars data={data.revenuePerShop} />
                </Card>
                <Card>
                  {data.revenuePerShop.map((row, index) => (
                    <KeyValue
                      key={row.shopId}
                      label={row.name}
                      value={formatMoney(row.revenue, language)}
                      last={index === data.revenuePerShop.length - 1}
                    />
                  ))}
                </Card>
              </>
            ) : (
              <EmptyState
                icon={Banknote}
                title={t('admin.revenuePerShop')}
                body={t('notif.emptySub')}
              />
            )}
          </>
        )}
      </Screen>
      <AdminTabBar active="analytics" />
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
    paddingBottom: ADMIN_TAB_BAR_HEIGHT + spacing.lg,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  grow: {
    flex: 1,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCell: {
    flexBasis: '47%',
    flexDirection: 'row',
    flexGrow: 1,
  },
  statSkeleton: {
    flexBasis: '47%',
    flexGrow: 1,
    gap: spacing.sm,
  },
});
