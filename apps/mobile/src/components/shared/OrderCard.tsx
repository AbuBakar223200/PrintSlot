import React, { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CalendarClock, FileText } from 'lucide-react-native';
import type { Order } from '@printslot/shared';
import { PickupMode } from '@printslot/shared';
import { Card, MoneyText, StatusBadge, Text } from '@/components/ui';
import { radii, spacing, useThemeTokens } from '@/theme';
import { formatRelative } from '@/i18n/format';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';

export interface OrderCardProps {
  order: Order;
  shopName?: string;
  onPress?: (id: string) => void;
}

function OrderCardComponent({ order, shopName, onPress }: OrderCardProps) {
  const tokens = useThemeTokens();
  const language = useSettingsStore((s) => s.language);
  const fileCount = order.orderFiles?.length ?? 0;

  return (
    <Pressable
      accessibilityLabel={`Order ${order.orderNumber}`}
      accessibilityRole="button"
      onPress={() => onPress?.(order.id)}
      style={({ pressed }) => [pressed ? styles.pressed : null]}
    >
      <Card style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.titleCol}>
            <Text variant="h3" color="textPrimary" numberOfLines={1}>
              {order.orderNumber}
            </Text>
            <Text variant="bodySm" color="textSecondary" numberOfLines={1}>
              {shopName ?? formatRelative(order.createdAt, language)}
            </Text>
          </View>
          <StatusBadge status={order.status} />
        </View>

        <View style={styles.metaRow}>
          <View style={[styles.pill, { backgroundColor: tokens.tintSoft }]}>
            <FileText size={13} color={tokens.primary} />
            <Text variant="caption" color="textSecondary">
              {fileCount} files
            </Text>
          </View>
          <View style={[styles.pill, { backgroundColor: tokens.tintSoft }]}>
            <CalendarClock size={13} color={tokens.primary} />
            <Text variant="caption" color="textSecondary">
              {order.pickupMode === PickupMode.SLOT ? 'Slot pickup' : 'Queue'}
            </Text>
          </View>
        </View>

        <View style={styles.bottomRow}>
          <Text variant="bodySm" color="textSecondary">
            {formatRelative(order.createdAt, language)}
          </Text>
          <MoneyText amount={Number(order.totalPrice)} variant="body" color="textPrimary" />
        </View>
      </Card>
    </Pressable>
  );
}

export const OrderCard = memo(OrderCardComponent);

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  topRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  titleCol: {
    flex: 1,
    gap: 2,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pill: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: radii.full,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  bottomRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
});
