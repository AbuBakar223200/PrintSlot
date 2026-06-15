import React, { useCallback } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Clock, MapPin, Phone, Zap } from 'lucide-react-native';
import { ShopStatus } from '@printslot/shared';
import {
  AmbientBackground,
  Banner,
  Button,
  ButtonIcon,
  ButtonText,
  Card,
  EmptyState,
  FrostCard,
  IconButton,
  MoneyText,
  Screen,
  Skeleton,
  Text,
} from '@/components/ui';
import { spacing, useThemeTokens } from '@/theme';
import { useShop, useActiveSlot } from '@/features/shops/hooks/useShop';

function getShopId(shopId?: string | string[]) {
  return typeof shopId === 'string' ? shopId : Array.isArray(shopId) ? shopId[0] ?? '' : '';
}

function PriceRow({
  label,
  amount,
  sign,
  value,
  first,
}: {
  label: string;
  amount?: number;
  sign?: '+';
  value?: string;
  first?: boolean;
}) {
  const tokens = useThemeTokens();
  return (
    <View style={[styles.priceRow, first ? null : { borderTopWidth: 1, borderTopColor: tokens.border }]}>
      <Text variant="body" color="textSecondary">{label}</Text>
      {amount != null ? (
        <MoneyText amount={amount} sign={sign} variant="body" color="textPrimary" style={styles.semibold} />
      ) : (
        <Text variant="body" color="textPrimary" style={styles.semibold}>{value}</Text>
      )}
    </View>
  );
}

export default function ShopDetailScreen() {
  const tokens = useThemeTokens();
  const insets = useSafeAreaInsets();
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
    router.push({ pathname: '/(customer)/orders/new', params: { shopId, mode: 'QUEUE' } });
  }, [shopId]);

  const schedulePickup = useCallback(() => {
    router.push({ pathname: '/(customer)/orders/new', params: { shopId, mode: 'SLOT' } });
  }, [shopId]);

  const goBack = useCallback(() => {
    router.back();
  }, []);

  if (isLoading) {
    return (
      <Screen contentContainerStyle={styles.scroll}>
        <Skeleton width={44} height={44} radius={14} />
        <FrostCard pad={20}>
          <View style={styles.heroSkel}>
            <Skeleton width="70%" height={26} />
            <Skeleton width="90%" height={14} />
            <Skeleton width="50%" height={14} />
          </View>
        </FrostCard>
        <Card>
          <View style={styles.heroSkel}>
            <Skeleton width="40%" height={16} />
            <Skeleton width="100%" height={14} />
            <Skeleton width="100%" height={14} />
          </View>
        </Card>
      </Screen>
    );
  }

  if (isError || !shop) {
    return (
      <Screen contentContainerStyle={styles.centerState}>
        <EmptyState
          icon={MapPin}
          title="Shop not found"
          body="This shop is unavailable or no longer exists."
          cta={{ label: 'Back', onPress: goBack }}
        />
      </Screen>
    );
  }

  const isActive = shop.status === ShopStatus.ACTIVE;
  const showPrintNow = isActive && activeSlot != null;
  const closesAt = activeSlot?.template?.endTime ?? null;

  return (
    <View style={styles.flex}>
      <AmbientBackground />
      <View style={[styles.flex, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <IconButton icon={ChevronLeft} accessibilityLabel="Back" onPress={goBack} variant="surface" />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
        >
          <FrostCard pad={20}>
            <View style={styles.hero}>
              <Text variant="h1" color="textPrimary">{shop.name}</Text>
              <View style={styles.metaRow}>
                <MapPin size={15} color={tokens.textMuted} />
                <Text variant="bodySm" color="textSecondary" style={styles.flexText}>{shop.address}</Text>
              </View>
              {shop.phone ? (
                <Pressable onPress={callPhone} hitSlop={8} style={styles.metaRow} testID="shop-detail-phone">
                  <Phone size={15} color={tokens.primary} />
                  <Text variant="bodySm" color="primary" style={styles.semibold}>{shop.phone}</Text>
                </Pressable>
              ) : null}
            </View>
          </FrostCard>

          {!isActive ? (
            <Banner tone="warn" icon={Clock} testID="shop-detail-status-banner">
              {`This shop is currently ${shop.status.toLowerCase()}`}
            </Banner>
          ) : null}

          {showPrintNow && closesAt ? (
            <Banner tone="success" icon={Clock}>{`Open now · closes ${closesAt}`}</Banner>
          ) : null}

          <Card>
            <Text variant="h3" color="textPrimary" style={styles.sectionTitle}>Pricing</Text>
            <PriceRow first label="Color (per page)" amount={Number(shop.colorRate)} />
            <PriceRow label="B&W (per page)" amount={Number(shop.bwRate)} />
            <PriceRow label="A3 surcharge (per page)" amount={Number(shop.a3Surcharge)} sign="+" />
            <PriceRow
              label="Duplex discount"
              value={`${Math.round((1 - Number(shop.duplexDiscount)) * 100)}% off`}
            />
          </Card>
        </ScrollView>

        {isActive ? (
          <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md, borderTopColor: tokens.border }]}>
            {showPrintNow ? (
              <Button onPress={printNow} disabled={isSlotLoading} size="lg" testID="shop-detail-print-now">
                <ButtonIcon><Zap size={18} color={tokens.onPrimary} /></ButtonIcon>
                <ButtonText>Print Now</ButtonText>
              </Button>
            ) : null}
            <Button
              onPress={schedulePickup}
              variant="secondary"
              size="lg"
              testID="shop-detail-schedule-pickup"
            >
              <ButtonText>Schedule Pickup</ButtonText>
            </Button>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  scroll: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  centerState: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  hero: {
    gap: spacing.sm,
  },
  heroSkel: {
    gap: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  flexText: { flex: 1 },
  sectionTitle: {
    marginBottom: spacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  semibold: { fontWeight: '600' },
  footer: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
});
