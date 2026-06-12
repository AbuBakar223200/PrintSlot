import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Bell } from 'lucide-react-native';
import type { NotificationItem } from '@/features/notifications/services/notificationService';
import {
  Button,
  ButtonText,
  Card,
  EmptyState,
  Screen,
  Skeleton,
  Text,
} from '@/components/ui';
import { CustomerTabBar, CUSTOMER_TAB_BAR_HEIGHT } from '@/components/shared/CustomerTabBar';
import { spacing, useTheme, useThemeTokens } from '@/theme';
import { NOTIFICATION_ICONS } from '@/components/ui/icons';
import { formatRelative } from '@/i18n/format';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/features/notifications/hooks/useNotifications';

const SKELETON_ROWS = ['n1', 'n2', 'n3', 'n4'];

export default function CustomerNotificationsScreen() {
  const notifications = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const items = notifications.data?.data ?? [];
  const unreadCount = items.filter((item) => !item.read).length;

  const retry = useCallback(() => {
    void notifications.refetch();
  }, [notifications]);

  const markAll = useCallback(() => {
    markAllRead.mutate();
  }, [markAllRead]);

  const renderNotification = useCallback(({ item }: { item: NotificationItem }) => (
    <NotificationRow
      item={item}
      onPress={() => {
        if (!item.read) markRead.mutate(item.id);
      }}
    />
  ), [markRead]);

  if (notifications.isLoading) {
    return (
      <View style={styles.root}>
        <Screen contentContainerStyle={styles.content}>
          <Header unreadCount={0} onMarkAll={markAll} />
          {SKELETON_ROWS.map((id) => (
            <Card key={id} style={styles.skeletonCard}>
              <Skeleton width="55%" height={14} />
              <Skeleton width="80%" height={12} />
            </Card>
          ))}
        </Screen>
        <CustomerTabBar active="notifications" unreadCount={0} />
      </View>
    );
  }

  if (notifications.isError && items.length === 0) {
    return (
      <View style={styles.root}>
        <Screen contentContainerStyle={styles.centerContent}>
          <EmptyState
            icon={Bell}
            title="Could not load alerts"
            body="Try again in a moment."
            cta={{ label: 'Retry', onPress: retry }}
          />
        </Screen>
        <CustomerTabBar active="notifications" unreadCount={0} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Screen scroll={false}>
        <FlashList
          contentContainerStyle={styles.listContent}
          data={items}
          estimatedItemSize={94}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={Separator}
          ListEmptyComponent={<EmptyState icon={Bell} title="All clear" body="New alerts will appear here." />}
          ListHeaderComponent={<Header unreadCount={unreadCount} onMarkAll={markAll} />}
          onRefresh={retry}
          refreshing={notifications.isRefetching && !notifications.isLoading}
          renderItem={renderNotification}
          showsVerticalScrollIndicator={false}
        />
      </Screen>
      <CustomerTabBar active="notifications" unreadCount={unreadCount} />
    </View>
  );
}

function Header({ unreadCount, onMarkAll }: { unreadCount: number; onMarkAll: () => void }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerTitleRow}>
        <View style={styles.grow}>
          <Text variant="h1" color="textPrimary">Alerts</Text>
          <Text variant="body" color="textSecondary">
            Order, wallet, and shop updates.
          </Text>
        </View>
        <Button size="sm" variant="secondary" disabled={unreadCount === 0} onPress={onMarkAll}>
          <ButtonText>Mark all read</ButtonText>
        </Button>
      </View>
    </View>
  );
}

function NotificationRow({ item, onPress }: { item: NotificationItem; onPress: () => void }) {
  const tokens = useThemeTokens();
  const { tones } = useTheme();
  const language = useSettingsStore((s) => s.language);
  const meta = NOTIFICATION_ICONS[item.type];
  const tone = tones[meta.tone];
  const Icon = meta.icon;

  return (
    <Pressable
      accessibilityLabel={item.title}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [pressed ? styles.pressed : null]}
    >
      <Card style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: tone.bg }]}>
          <Icon size={18} color={tone.fg} />
        </View>
        <View style={styles.notificationText}>
          <Text
            variant="body"
            color="textPrimary"
            numberOfLines={1}
            style={item.read ? styles.normal : styles.unreadTitle}
          >
            {item.title}
          </Text>
          <Text variant="bodySm" color="textSecondary" numberOfLines={2}>
            {item.body}
          </Text>
          <Text variant="caption" color="textMuted">
            {formatRelative(item.createdAt, language)}
          </Text>
        </View>
        {!item.read ? (
          <View
            accessibilityLabel="Unread"
            style={[styles.unreadDot, { backgroundColor: tokens.primary }]}
          />
        ) : null}
      </Card>
    </Pressable>
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
    gap: spacing.md,
    padding: spacing.xl,
    paddingBottom: CUSTOMER_TAB_BAR_HEIGHT + spacing.xl,
  },
  centerContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    paddingBottom: CUSTOMER_TAB_BAR_HEIGHT + spacing.xl,
  },
  listContent: {
    padding: spacing.xl,
    paddingBottom: CUSTOMER_TAB_BAR_HEIGHT + spacing.xl,
  },
  header: {
    paddingBottom: spacing.lg,
  },
  headerTitleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  grow: {
    flex: 1,
    gap: spacing.sm,
  },
  row: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  iconWrap: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: 11,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  notificationText: {
    flex: 1,
    gap: 3,
  },
  unreadTitle: {
    fontWeight: '700',
  },
  normal: {
    fontWeight: '500',
  },
  unreadDot: {
    borderRadius: 9999,
    height: 9,
    marginTop: 6,
    width: 9,
  },
  separator: {
    height: spacing.md,
  },
  skeletonCard: {
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
});
