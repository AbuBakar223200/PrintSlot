import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Banknote, BarChart3, CheckCheck, Info, Package, Timer } from 'lucide-react-native';
import { OrderStatus } from '@printslot/shared';
import {
  Avatar,
  Card,
  EmptyState,
  MoneyText,
  Screen,
  Skeleton,
  StatCard,
  Text,
} from '@/components/ui';
import { OwnerTabBar, OWNER_TAB_BAR_HEIGHT } from '@/components/shared/OwnerTabBar';
import { spacing, useThemeTokens } from '@/theme';
import { formatMoney, localizeDigits } from '@/i18n/format';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import { StatusDonut } from '@/features/owner/components/StatusDonut';
import { useOwnerShop } from '@/features/owner/hooks/useOwnerShop';
import { useOwnerAnalytics } from '@/features/owner/hooks/useOwnerAnalytics';

export default function OwnerAnalyticsScreen() {
  const { t } = useTranslation();
  const tokens = useThemeTokens();
  const language = useSettingsStore((s) => s.language);
  const { data: shop } = useOwnerShop();
  const shopId = shop?.id ?? null;
  const { data, isLoading, isError, refetch } = useOwnerAnalytics(shopId);

  const openProfile = useCallback(() => {
    router.push('/(owner)/profile' as never);
  }, []);

  return (
    <View style={styles.root}>
      <Screen contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.grow}>
            <Text variant="h1" color="textPrimary">{t('owner.analyticsTitle')}</Text>
          </View>
          <Pressable
            accessibilityLabel={t('tab.profile')}
            accessibilityRole="button"
            hitSlop={8}
            onPress={openProfile}
            testID="owner-analytics-profile-button"
          >
            <Avatar name={shop?.name ?? 'Shop'} size="md" />
          </Pressable>
        </View>

        {isLoading ? (
          <>
            <View style={styles.statGrid}>
              {['a1', 'a2', 'a3', 'a4'].map((id) => (
                <Card key={id} style={styles.statSkeleton}>
                  <Skeleton width={32} height={32} radius={10} />
                  <Skeleton width="60%" height={22} />
                  <Skeleton width="80%" height={12} />
                </Card>
              ))}
            </View>
            <Card>
              <Skeleton width="100%" height={120} />
            </Card>
          </>
        ) : isError || !data ? (
          <EmptyState
            icon={BarChart3}
            title={t('owner.analyticsTitle')}
            body={t('staff.emptySub')}
            cta={{ label: t('common.retry'), onPress: () => void refetch() }}
          />
        ) : (
          <>
            <View style={styles.statGrid}>
              <View style={styles.statCell}>
                <StatCard
                  index={0}
                  icon={Package}
                  label={t('owner.totalOrders')}
                  value={localizeDigits(data.totalOrders, language)}
                />
              </View>
              <View style={styles.statCell}>
                <StatCard
                  index={1}
                  icon={Banknote}
                  label={t('owner.revenue')}
                  value={formatMoney(data.revenue, language)}
                />
              </View>
              <View style={styles.statCell}>
                <StatCard
                  index={2}
                  icon={Timer}
                  label={t('owner.avgProcessing')}
                  value={t('owner.mins', { n: localizeDigits(data.avgProcessingMins, language) })}
                />
              </View>
              <View style={styles.statCell}>
                <StatCard
                  index={3}
                  icon={CheckCheck}
                  label={t('status.COLLECTED')}
                  value={localizeDigits(data.byStatus[OrderStatus.COLLECTED] ?? 0, language)}
                />
              </View>
            </View>

            <Text variant="h3" color="textPrimary">{t('owner.breakdown')}</Text>
            <Card>
              <StatusDonut byStatus={data.byStatus} />
              <View style={styles.note}>
                <Info size={13} color={tokens.textMuted} />
                <Text variant="caption" color="textMuted" style={styles.noteText}>
                  {t('owner.revenueNote')}
                </Text>
              </View>
            </Card>
          </>
        )}
      </Screen>
      <OwnerTabBar active="analytics" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.xl,
    paddingBottom: OWNER_TAB_BAR_HEIGHT + spacing.xl,
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
  note: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: spacing.md,
  },
  noteText: {
    flex: 1,
  },
});
