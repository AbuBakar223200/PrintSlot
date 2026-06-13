import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Inbox, Search, Store } from 'lucide-react-native';
import { FlashList } from '@shopify/flash-list';
import { OrderStatus, type Order } from '@printslot/shared';
import {
  Avatar,
  Button,
  ButtonIcon,
  ButtonText,
  Card,
  EmptyState,
  Input,
  Screen,
  Skeleton,
  Text,
} from '@/components/ui';
import { CustomerTabBar, CUSTOMER_TAB_BAR_HEIGHT } from '@/components/shared/CustomerTabBar';
import { OrderCard } from '@/components/shared/OrderCard';
import { spacing, useThemeTokens } from '@/theme';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { useOrders } from '@/features/orders/hooks/useOrders';
import { useShops } from '@/features/shops/hooks/useShops';
import { useUnreadCount } from '@/features/notifications/hooks/useNotifications';
import { ActiveOrderCard } from '@/features/orders/components/ActiveOrderCard';

const ACTIVE_STATUSES = new Set<OrderStatus>([
  OrderStatus.QUEUED,
  OrderStatus.SCHEDULED,
  OrderStatus.PROCESSING,
  OrderStatus.READY,
]);

interface ActiveItem {
  order: Order;
  shopName: string;
}

/**
 * Customer Home hub (prototype `SCREENS.home`): greeting + Avatar→Profile, a
 * search field that routes to the shop list, a horizontal rail of active orders,
 * a "recent orders" section with See-all, and a Browse Shops CTA. Shop names are
 * resolved once at this parent and passed down as primitives (no per-card query).
 */
export default function CustomerHomeScreen() {
  const tokens = useThemeTokens();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const unreadCount = useUnreadCount();
  const { data, isLoading } = useOrders();
  const { data: shops } = useShops();

  const firstName = user?.name?.trim().split(/\s+/)[0] ?? '';
  const orders = data?.data ?? [];

  const shopNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const shop of shops ?? []) {
      map.set(shop.id, shop.name);
    }
    return map;
  }, [shops]);

  const activeItems = useMemo<ActiveItem[]>(
    () =>
      orders
        .filter((order) => ACTIVE_STATUSES.has(order.status))
        .slice(0, 6)
        .map((order) => ({ order, shopName: shopNames.get(order.shopId) ?? '' })),
    [orders, shopNames],
  );
  const recentOrders = orders.slice(0, 3);

  const openShops = useCallback(() => {
    router.push('/(customer)/shops' as never);
  }, []);

  const openProfile = useCallback(() => {
    router.push('/(customer)/profile' as never);
  }, []);

  const openHistory = useCallback(() => {
    router.push('/(customer)/orders' as never);
  }, []);

  const openOrder = useCallback((id: string) => {
    router.push(`/(customer)/orders/${id}` as never);
  }, []);

  const renderActiveOrder = useCallback(({ item }: { item: ActiveItem }) => (
    <View style={styles.activeOrderCard}>
      <ActiveOrderCard order={item.order} shopName={item.shopName} onPress={openOrder} />
    </View>
  ), [openOrder]);

  return (
    <View style={styles.root}>
      <Screen contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text variant="h1" color="textPrimary" style={styles.grow} numberOfLines={1}>
            {t('home.greeting', { name: firstName })}
          </Text>
          <Pressable
            onPress={openProfile}
            accessibilityRole="button"
            accessibilityLabel={t('profile.title')}
            hitSlop={8}
          >
            <Avatar name={user?.name} size="md" />
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('home.searchHint')}
          onPress={openShops}
        >
          <View pointerEvents="none">
            <Input
              leftIcon={<Search size={18} color={tokens.textMuted} />}
              placeholder={t('home.searchHint')}
              editable={false}
            />
          </View>
        </Pressable>

        <View style={styles.section}>
          <Text variant="h3" color="textPrimary">{t('home.activeOrders')}</Text>
          {isLoading ? (
            <Card style={styles.loadingCard}>
              <Skeleton width="60%" height={16} />
              <Skeleton width="85%" height={12} />
            </Card>
          ) : activeItems.length > 0 ? (
            <FlashList
              data={activeItems}
              estimatedItemSize={210}
              horizontal
              keyExtractor={(item) => item.order.id}
              renderItem={renderActiveOrder}
              showsHorizontalScrollIndicator={false}
            />
          ) : (
            <EmptyState icon={Inbox} title={t('home.noActive')} body={t('home.noActiveSub')} />
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="h3" color="textPrimary" style={styles.grow}>
              {t('home.recentOrders')}
            </Text>
            <Pressable onPress={openHistory} accessibilityRole="button" hitSlop={8}>
              <Text variant="label" color="primary">{t('common.seeAll')}</Text>
            </Pressable>
          </View>
          <View style={styles.recentList}>
            {recentOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                shopName={shopNames.get(order.shopId)}
                onPress={openOrder}
              />
            ))}
            {!isLoading && recentOrders.length === 0 ? (
              <Text variant="bodySm" color="textSecondary">{t('history.emptySub')}</Text>
            ) : null}
          </View>
        </View>

        <Button onPress={openShops} variant="secondary" size="lg" testID="customer-shops-button">
          <ButtonIcon><Store size={18} color={tokens.primary} /></ButtonIcon>
          <ButtonText>{t('home.browseShops')}</ButtonText>
        </Button>
      </Screen>
      <CustomerTabBar active="home" unreadCount={unreadCount} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
    paddingBottom: CUSTOMER_TAB_BAR_HEIGHT + spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  grow: {
    flex: 1,
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  activeOrderCard: {
    marginRight: spacing.md,
    width: 264,
  },
  loadingCard: {
    gap: spacing.sm,
  },
  recentList: {
    gap: spacing.md,
  },
});
