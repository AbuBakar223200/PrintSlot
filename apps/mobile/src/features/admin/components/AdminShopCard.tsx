import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check, Info, MapPin, Pause, Play, X } from 'lucide-react-native';
import { ShopStatus, type Shop } from '@printslot/shared';
import { Banner, Button, ButtonIcon, ButtonText, Card, Text } from '@/components/ui';
import { radii, spacing, useTheme } from '@/theme';
import { SHOP_STATUS_META } from '@/features/admin/shopStatusMeta';

export interface AdminShopCardProps {
  shop: Shop;
  onApprove: (shopId: string) => void;
  onSuspend: (shopId: string) => void;
  onReinstate: (shopId: string) => void;
  onReject: (shopId: string) => void;
}

/**
 * Prototype `adminShopRow`: a shop card (name + address + tinted status badge)
 * with status-specific actions:
 *   PENDING   → Approve + Reject
 *   ACTIVE    → Suspend
 *   SUSPENDED → Reinstate + Reject
 *   REJECTED  → read-only reason Banner
 */
export function AdminShopCard({
  shop,
  onApprove,
  onSuspend,
  onReinstate,
  onReject,
}: AdminShopCardProps) {
  const { t } = useTranslation();
  const { tones, tokens } = useTheme();
  const meta = SHOP_STATUS_META[shop.status];
  const tone = tones[meta.tone];
  const StatusIcon = meta.icon;

  return (
    <Card style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.grow}>
          <Text variant="h3" color="textPrimary">{shop.name}</Text>
          <View style={styles.addressRow}>
            <MapPin size={12} color={tokens.textMuted} />
            <Text variant="caption" color="textMuted" style={styles.address}>
              {shop.address}
            </Text>
          </View>
        </View>
        <View style={[styles.badge, { backgroundColor: tone.bg }]}>
          <StatusIcon size={13} color={tone.fg} />
          <Text variant="caption" style={[styles.badgeText, { color: tone.fg }]}>
            {/* Prototype renders the raw uppercase shop status (no i18n key exists
                for shop statuses — only OrderStatus has status.* keys). */}
            {shop.status}
          </Text>
        </View>
      </View>

      <ShopActions
        shop={shop}
        onApprove={onApprove}
        onSuspend={onSuspend}
        onReinstate={onReinstate}
        onReject={onReject}
      />
    </Card>
  );
}

function ShopActions({
  shop,
  onApprove,
  onSuspend,
  onReinstate,
  onReject,
}: AdminShopCardProps) {
  const { t } = useTranslation();
  const { tokens } = useTheme();

  if (shop.status === ShopStatus.PENDING) {
    return (
      <View style={styles.actionRow}>
        <View style={styles.grow}>
          <Button size="sm" onPress={() => onApprove(shop.id)} testID={`approve-${shop.id}`}>
            <ButtonIcon><Check size={16} color={tokens.onPrimary} /></ButtonIcon>
            <ButtonText>{t('admin.approve')}</ButtonText>
          </Button>
        </View>
        <View style={styles.grow}>
          <Button size="sm" variant="danger" onPress={() => onReject(shop.id)} testID={`reject-${shop.id}`}>
            <ButtonIcon><X size={16} color={tokens.onPrimary} /></ButtonIcon>
            <ButtonText>{t('admin.reject')}</ButtonText>
          </Button>
        </View>
      </View>
    );
  }

  if (shop.status === ShopStatus.ACTIVE) {
    return (
      <View style={styles.singleAction}>
        <Button size="sm" variant="danger" onPress={() => onSuspend(shop.id)} testID={`suspend-${shop.id}`}>
          <ButtonIcon><Pause size={16} color={tokens.onPrimary} /></ButtonIcon>
          <ButtonText>{t('admin.suspend')}</ButtonText>
        </Button>
      </View>
    );
  }

  if (shop.status === ShopStatus.SUSPENDED) {
    return (
      <View style={styles.actionRow}>
        <View style={styles.grow}>
          <Button size="sm" onPress={() => onReinstate(shop.id)} testID={`reinstate-${shop.id}`}>
            <ButtonIcon><Play size={16} color={tokens.onPrimary} /></ButtonIcon>
            <ButtonText>{t('admin.reinstate')}</ButtonText>
          </Button>
        </View>
        <View style={styles.grow}>
          <Button size="sm" variant="danger" onPress={() => onReject(shop.id)} testID={`reject-${shop.id}`}>
            <ButtonIcon><X size={16} color={tokens.onPrimary} /></ButtonIcon>
            <ButtonText>{t('admin.reject')}</ButtonText>
          </Button>
        </View>
      </View>
    );
  }

  // REJECTED — read-only reason banner.
  return (
    <Banner tone="error" icon={Info}>
      {shop.rejectionReason ?? t('admin.readonly')}
    </Banner>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  grow: {
    flex: 1,
  },
  addressRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
    marginTop: 3,
  },
  address: {
    flex: 1,
  },
  badge: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: radii.full,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  singleAction: {
    alignSelf: 'flex-start',
  },
});
