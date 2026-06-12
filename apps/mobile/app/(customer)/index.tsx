import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Search, Store } from 'lucide-react-native';
import { FlashList } from '@shopify/flash-list';
import { OrderStatus, type Order } from '@printslot/shared';
import {
  Avatar,
  Button,
  ButtonIcon,
  ButtonText,
  Card,
  EmptyState,
  FrostCard,
  Screen,
  Skeleton,
  Text,
} from '@/components/ui';
import { CustomerTabBar, CUSTOMER_TAB_BAR_HEIGHT } from '@/components/shared/CustomerTabBar';
import { OrderCard } from '@/components/shared/OrderCard';
import { spacing, useThemeTokens } from '@/theme';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { useOrders } from '@/features/orders/hooks/useOrders';
import { useUnreadCount } from '@/features/notifications/hooks/useNotifications';

const ACTIVE_STATUSES = new Set<OrderStatus>([
  OrderStatus.QUEUED,
  OrderStatus.SCHEDULED,
  OrderStatus.PROCESSING,
  OrderStatus.READY,
]);

/**
 * Customer home landing (spec §8.3 shell). The full Home hub — search, active
 * orders, recent activity — lands with Slice 32. For now this is a reskinned
 * landing: time-agnostic greeting + Avatar→Profile + a Browse Shops CTA.
 */
export default function CustomerHomeScreen() {
  const tokens = useThemeTokens();
  const user = useAuthStore((s) => s.user);
  const unreadCount = useUnreadCount();
  const { data, isLoading } = useOrders();
  const firstName = user?.name?.trim().split(/\s+/)[0] || 'there';
  const orders = data?.data ?? [];
  const activeOrders = orders.filter((order) => ACTIVE_STATUSES.has(order.status)).slice(0, 4);
  const recentOrders = orders.slice(0, 3);

  const openShops = useCallback(() => {
    router.push('/(customer)/shops' as never);
  }, []);

  const openProfile = useCallback(() => {
    router.push('/(customer)/profile' as never);
  }, []);

  const openOrder = useCallback((id: string) => {
    router.push(`/(customer)/orders/${id}` as never);
  }, []);

  const renderActiveOrder = useCallback(({ item }: { item: Order }) => (
    <View style={styles.activeOrderCard}>
      <OrderCard order={item} onPress={openOrder} />
    </View>
  ), [openOrder]);

  return (
    <View style={styles.root}>
      <Screen contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.grow}>
          <Text variant="bodySm" color="textSecondary">Hello,</Text>
          <Text variant="h1" color="textPrimary">{firstName}</Text>
        </View>
        <Pressable
          onPress={openProfile}
          accessibilityRole="button"
          accessibilityLabel="Profile"
          hitSlop={8}
        >
          <Avatar name={user?.name} size="md" />
        </Pressable>
      </View>

      <FrostCard pad={20}>
        <View style={styles.hero}>
          <Text variant="h2" color="textPrimary">Print without waiting</Text>
          <Text variant="body" color="textSecondary">
            Find a nearby shop, upload files, and track pickup from one flow.
          </Text>
          <Pressable
            accessibilityLabel="Search shops"
            accessibilityRole="button"
            onPress={openShops}
            style={[styles.searchBar, { backgroundColor: tokens.surface, borderColor: tokens.border }]}
          >
            <Search size={18} color={tokens.textMuted} />
            <Text variant="bodySm" color="textMuted">Search shops</Text>
          </Pressable>
        </View>
      </FrostCard>

      <View style={styles.actions}>
        <Button onPress={openShops} size="lg" testID="customer-shops-button">
          <ButtonIcon><Store size={18} color={tokens.onPrimary} /></ButtonIcon>
          <ButtonText>Browse Shops</ButtonText>
        </Button>
      </View>

      <View style={styles.section}>
        <Text variant="h3" color="textPrimary">Active orders</Text>
        {isLoading ? (
          <Card style={styles.loadingCard}>
            <Skeleton width="60%" height={16} />
            <Skeleton width="85%" height={12} />
          </Card>
        ) : activeOrders.length > 0 ? (
          <FlashList
            data={activeOrders}
            estimatedItemSize={210}
            horizontal
            keyExtractor={(item) => item.id}
            renderItem={renderActiveOrder}
            showsHorizontalScrollIndicator={false}
          />
        ) : (
          <EmptyState icon={Store} title="No active orders" body="Start with a shop when you need prints." />
        )}
      </View>

      <View style={styles.section}>
        <Text variant="h3" color="textPrimary">Recent orders</Text>
        <View style={styles.recentList}>
          {recentOrders.map((order) => (
            <OrderCard key={order.id} order={order} onPress={openOrder} />
          ))}
          {!isLoading && recentOrders.length === 0 ? (
            <Text variant="bodySm" color="textSecondary">Your recent orders will appear here.</Text>
          ) : null}
        </View>
      </View>
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
    gap: 2,
  },
  hero: {
    gap: spacing.md,
  },
  searchBar: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 50,
    paddingHorizontal: spacing.md,
  },
  actions: {
    gap: spacing.md,
  },
  section: {
    gap: spacing.md,
  },
  activeOrderCard: {
    marginRight: spacing.md,
    width: 284,
  },
  loadingCard: {
    gap: spacing.sm,
  },
  recentList: {
    gap: spacing.md,
  },
});
