import React, { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PackageCheck } from 'lucide-react-native';
import { OrderStatus, type Order } from '@printslot/shared';
import { FrostCard, StatusBadge, Text } from '@/components/ui';
import { spacing, useThemeTokens } from '@/theme';
import { localizeDigits } from '@/i18n/format';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';

export interface ActiveOrderCardProps {
  order: Order;
  /** Resolved shop name (passed as a primitive — no per-card queries). */
  shopName?: string;
  /** Live queue position, when the list endpoint attaches it. */
  position?: number | null;
  /** Live ETA in minutes, when the list endpoint attaches it. */
  etaMins?: number | null;
  onPress?: (id: string) => void;
}

/**
 * Home-hub active order card (prototype `.active-card`). A frosted tile with the
 * order number + StatusBadge, the shop name, and a live row: a pulsing dot with
 * the queue position/ETA while QUEUED/PROCESSING, or a "ready/collected" note for
 * terminal-active states. Live stats are optional — they arrive over the socket
 * on the detail screen, so here we fall back to the status label when absent.
 */
function ActiveOrderCardComponent({ order, shopName, position, etaMins, onPress }: ActiveOrderCardProps) {
  const tokens = useThemeTokens();
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);

  const isLive = order.status === OrderStatus.QUEUED || order.status === OrderStatus.PROCESSING;
  const isReady = order.status === OrderStatus.READY;
  const hasStats = position != null;

  return (
    <Pressable
      accessibilityLabel={`Order ${order.orderNumber}`}
      accessibilityRole="button"
      onPress={() => onPress?.(order.id)}
      style={({ pressed }) => [pressed ? styles.pressed : null]}
    >
      <FrostCard pad={16}>
        <View style={styles.body}>
          <View style={styles.topRow}>
            <Text variant="h3" color="textPrimary" numberOfLines={1} style={styles.grow}>
              {order.orderNumber}
            </Text>
            <StatusBadge status={order.status} />
          </View>

          {shopName ? (
            <Text variant="bodySm" color="textSecondary" numberOfLines={1}>
              {shopName}
            </Text>
          ) : null}

          {isLive ? (
            <View style={styles.liveRow}>
              <View style={[styles.dot, { backgroundColor: tokens.success }]} />
              <Text variant="bodySm" color="textSecondary" numberOfLines={1}>
                {hasStats
                  ? t('home.position', {
                      p: localizeDigits(position as number, language),
                      m: localizeDigits(etaMins ?? 0, language),
                    })
                  : t(`status.${order.status}`)}
              </Text>
            </View>
          ) : (
            <View style={styles.liveRow}>
              <PackageCheck size={15} color={tokens.success} />
              <Text variant="bodySm" style={{ color: tokens.success }} numberOfLines={1}>
                {isReady ? t('status.READY') : t('order.collectedNote')}
              </Text>
            </View>
          )}
        </View>
      </FrostCard>
    </Pressable>
  );
}

export const ActiveOrderCard = memo(ActiveOrderCardComponent);

const styles = StyleSheet.create({
  body: {
    gap: spacing.sm,
  },
  grow: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 9999,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
});
