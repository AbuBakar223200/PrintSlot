import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Plus, Receipt } from 'lucide-react-native';
import type { Order } from '@printslot/shared';
import {
  Button,
  ButtonIcon,
  ButtonText,
  EmptyState,
  Screen,
  Skeleton,
  Text,
} from '@/components/ui';
import { CustomerTabBar, CUSTOMER_TAB_BAR_HEIGHT } from '@/components/shared/CustomerTabBar';
import { OrderCard } from '@/components/shared/OrderCard';
import { spacing, useThemeTokens } from '@/theme';
import { useUnreadCount } from '@/features/notifications/hooks/useNotifications';
import { useOrders } from '@/features/orders/hooks/useOrders';
import { useShops } from '@/features/shops/hooks/useShops';

const SKELETON_ROWS = ['o1', 'o2', 'o3'];

export default function CustomerOrdersScreen() {
  const tokens = useThemeTokens();
  const { t } = useTranslation();
  const unreadCount = useUnreadCount();
  const { data, isError, isLoading, isRefetching, refetch } = useOrders();
  const { data: shops } = useShops();
  const orders = data?.data ?? [];

  const shopNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const shop of shops ?? []) {
      map.set(shop.id, shop.name);
    }
    return map;
  }, [shops]);

  const openOrder = useCallback((id: string) => {
    router.push(`/(customer)/orders/${id}` as never);
  }, []);

  const openShops = useCallback(() => {
    router.push('/(customer)/shops' as never);
  }, []);

  const retry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const renderOrder = useCallback(({ item }: { item: Order }) => (
    <OrderCard order={item} shopName={shopNames.get(item.shopId)} onPress={openOrder} />
  ), [openOrder, shopNames]);

  if (isLoading) {
    return (
      <View style={styles.root}>
        <Screen contentContainerStyle={styles.content}>
          <Header title={t('history.title')} />
          <View style={styles.list}>
            {SKELETON_ROWS.map((id) => (
              <View key={id} style={styles.skeletonCard}>
                <Skeleton width="50%" height={18} />
                <Skeleton width="70%" height={12} />
                <Skeleton width="35%" height={12} />
              </View>
            ))}
          </View>
        </Screen>
        <CustomerTabBar active="orders" unreadCount={unreadCount} />
      </View>
    );
  }

  if (isError && orders.length === 0) {
    return (
      <View style={styles.root}>
        <Screen contentContainerStyle={styles.centerContent}>
          <EmptyState
            icon={Receipt}
            title={t('history.empty')}
            body={t('history.emptySub')}
            cta={{ label: t('common.retry'), onPress: retry }}
          />
        </Screen>
        <CustomerTabBar active="orders" unreadCount={unreadCount} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Screen scroll={false}>
        <FlashList
          contentContainerStyle={styles.listContent}
          data={orders}
          estimatedItemSize={150}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={Separator}
          ListEmptyComponent={(
            <EmptyState
              icon={Receipt}
              title={t('history.empty')}
              body={t('history.emptySub')}
              cta={{ label: t('home.browseShops'), onPress: openShops }}
            />
          )}
          ListHeaderComponent={<Header title={t('history.title')} />}
          onRefresh={retry}
          refreshing={isRefetching && !isLoading}
          renderItem={renderOrder}
          showsVerticalScrollIndicator={false}
        />
      </Screen>
      <Button onPress={openShops} size="sm" style={styles.fab} accessibilityLabel={t('history.newOrder')}>
        <ButtonIcon><Plus size={18} color={tokens.onPrimary} /></ButtonIcon>
        <ButtonText>{t('history.newOrder')}</ButtonText>
      </Button>
      <CustomerTabBar active="orders" unreadCount={unreadCount} />
    </View>
  );
}

function Header({ title }: { title: string }) {
  return (
    <View style={styles.header}>
      <Text variant="h1" color="textPrimary">{title}</Text>
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
    padding: spacing.xl,
    paddingBottom: CUSTOMER_TAB_BAR_HEIGHT + spacing.xl,
  },
  centerContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    paddingBottom: CUSTOMER_TAB_BAR_HEIGHT + spacing.xl,
  },
  header: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  listContent: {
    padding: spacing.xl,
    paddingBottom: CUSTOMER_TAB_BAR_HEIGHT + spacing.xl,
  },
  list: {
    gap: spacing.md,
  },
  skeletonCard: {
    gap: spacing.sm,
  },
  separator: {
    height: spacing.md,
  },
  fab: {
    bottom: CUSTOMER_TAB_BAR_HEIGHT + spacing.sm,
    position: 'absolute',
    right: spacing.lg,
    width: undefined,
    zIndex: 18,
  },
});
