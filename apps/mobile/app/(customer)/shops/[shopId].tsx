import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ShopStatus, type Shop } from '@printslot/shared';
import { Button, ButtonText } from '@/components/ui/Button';
import { colors, spacing, borderRadius, typography } from '@/config/theme';
import { useShop, useActiveSlot } from '@/features/shops/hooks/useShop';
import { formatCurrency } from '@/utils/formatCurrency';

function getShopId(shopId?: string | string[]) {
  return typeof shopId === 'string' ? shopId : Array.isArray(shopId) ? shopId[0] ?? '' : '';
}

function PriceRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.priceRow}>
      <Text style={styles.priceLabel}>{label}</Text>
      <Text style={styles.priceValue}>{value}</Text>
    </View>
  );
}

export default function ShopDetailScreen() {
  const params = useLocalSearchParams<{ shopId?: string | string[] }>();
  const shopId = getShopId(params.shopId);

  const { data: shop, isLoading, isError } = useShop(shopId);
  const { data: activeSlot, isLoading: isSlotLoading } = useActiveSlot(shopId);

  const callPhone = useCallback(() => {
    if (shop?.phone) {
      void Linking.openURL(`tel:${shop.phone}`);
    }
  }, [shop?.phone]);

  const printNow = useCallback(() => {
    router.push({
      pathname: '/(customer)/orders/new',
      params: { shopId, mode: 'QUEUE' },
    });
  }, [shopId]);

  const schedulePickup = useCallback(() => {
    router.push({
      pathname: '/(customer)/orders/new',
      params: { shopId, mode: 'SLOT' },
    });
  }, [shopId]);

  const goBack = useCallback(() => {
    router.back();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#1A1A2E', '#16213E', '#0F3460']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.stateText}>Loading shop...</Text>
        </View>
      </View>
    );
  }

  if (isError || !shop) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#1A1A2E', '#16213E', '#0F3460']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.centerState}>
          <Text style={styles.stateTitle}>Shop not found</Text>
          <Text style={styles.stateText}>This shop is unavailable or no longer exists.</Text>
          <Button onPress={goBack} variant="secondary" testID="shop-detail-back-button">
            <ButtonText>Back</ButtonText>
          </Button>
        </View>
      </View>
    );
  }

  const isActive = shop.status === ShopStatus.ACTIVE;
  const showPrintNow = isActive && activeSlot != null;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1A1A2E', '#16213E', '#0F3460']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={styles.orbTopRight} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header card */}
        <Animated.View entering={FadeInDown.duration(600).delay(100)} style={styles.card}>
          <Text style={styles.shopName}>{shop.name}</Text>
          <Text style={styles.address}>{shop.address}</Text>
          {shop.phone ? (
            <Pressable onPress={callPhone} hitSlop={8} testID="shop-detail-phone">
              <Text style={styles.phone}>{shop.phone}</Text>
            </Pressable>
          ) : null}
        </Animated.View>

        {/* Status banner */}
        {!isActive ? (
          <Animated.View
            entering={FadeInDown.duration(600).delay(200)}
            style={styles.banner}
            testID="shop-detail-status-banner"
          >
            <Text style={styles.bannerText}>
              This shop is currently {shop.status.toLowerCase()}
            </Text>
          </Animated.View>
        ) : null}

        {/* Pricing */}
        <Animated.View entering={FadeInDown.duration(600).delay(250)} style={styles.card}>
          <Text style={styles.sectionTitle}>Pricing</Text>
          <PriceRow label="Color (per page)" value={formatCurrency(shop.colorRate)} />
          <PriceRow label="B&W (per page)" value={formatCurrency(shop.bwRate)} />
          <PriceRow label="A3 surcharge (per page)" value={formatCurrency(shop.a3Surcharge)} />
          <PriceRow
            label="Duplex discount"
            value={`${Math.round((1 - Number(shop.duplexDiscount)) * 100)}% off`}
          />
        </Animated.View>

        {/* Actions */}
        {isActive ? (
          <Animated.View entering={FadeInDown.duration(600).delay(300)} style={styles.actionRow}>
            {showPrintNow ? (
              <Button
                onPress={printNow}
                disabled={isSlotLoading}
                size="lg"
                style={styles.actionButton}
                testID="shop-detail-print-now"
              >
                <ButtonText>Print Now</ButtonText>
              </Button>
            ) : null}
            <Button
              onPress={schedulePickup}
              variant="secondary"
              size="lg"
              style={styles.actionButton}
              testID="shop-detail-schedule-pickup"
            >
              <ButtonText>Schedule Pickup</ButtonText>
            </Button>
          </Animated.View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  orbTopRight: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
  },
  scrollContent: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  stateTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  stateText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.glassBg,
    borderRadius: borderRadius.xl,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  shopName: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  address: {
    ...typography.body,
    color: colors.textSecondary,
  },
  phone: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  banner: {
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    borderRadius: borderRadius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.warning,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  bannerText: {
    ...typography.bodySm,
    color: colors.warning,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing.md,
  },
  priceLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  priceValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  actionRow: {
    gap: spacing.md,
  },
  actionButton: {
    width: '100%',
  },
});
