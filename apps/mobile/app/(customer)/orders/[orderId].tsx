import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, MapPin, Receipt, WifiOff, XCircle } from 'lucide-react-native';
import {
  ColorMode,
  Orientation,
  OrderStatus,
  PaymentMethod,
  PickupMode,
  type Order,
  type OrderFile,
} from '@printslot/shared';
import {
  AmbientBackground,
  Avatar,
  Banner,
  Button,
  ButtonIcon,
  ButtonText,
  Card,
  Chip,
  EmptyState,
  FrostCard,
  IconButton,
  KeyValue,
  MoneyText,
  Sheet,
  Skeleton,
  StatusBadge,
  Text,
  Timeline,
  toast,
} from '@/components/ui';
import { spacing, useThemeTokens } from '@/theme';
import { localizeDigits } from '@/i18n/format';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import { useShop } from '@/features/shops/hooks/useShop';
import { useCancelOrder, useOrder } from '@/features/orders/hooks/useOrder';
import { useOrderTracking } from '@/features/orders/hooks/useOrderTracking';

/** Ordered status rails (queue + slot pipelines) for the Timeline. */
const TIMELINE_QUEUE: readonly OrderStatus[] = [
  OrderStatus.QUEUED,
  OrderStatus.PROCESSING,
  OrderStatus.READY,
  OrderStatus.COLLECTED,
];
const TIMELINE_SLOT: readonly OrderStatus[] = [
  OrderStatus.SCHEDULED,
  OrderStatus.PROCESSING,
  OrderStatus.READY,
  OrderStatus.COLLECTED,
];

const CANCELLABLE = new Set<OrderStatus>([OrderStatus.QUEUED, OrderStatus.SCHEDULED]);
const LIVE_STATUSES = new Set<OrderStatus>([OrderStatus.QUEUED, OrderStatus.PROCESSING]);

function getOrderId(value?: string | string[]) {
  return typeof value === 'string' ? value : Array.isArray(value) ? value[0] ?? '' : '';
}

export default function OrderDetailScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ orderId?: string | string[] }>();
  const orderId = getOrderId(params.orderId);

  const { data: order, isLoading, isError } = useOrder(orderId);
  const tracking = useOrderTracking(orderId);
  const cancelOrder = useCancelOrder();
  const [confirmVisible, setConfirmVisible] = useState(false);

  const goBack = useCallback(() => {
    router.back();
  }, []);

  const openConfirm = useCallback(() => setConfirmVisible(true), []);
  const closeConfirm = useCallback(() => setConfirmVisible(false), []);

  const doCancel = useCallback(() => {
    if (!orderId) {
      return;
    }
    cancelOrder.mutate(orderId, {
      onSuccess: () => {
        setConfirmVisible(false);
        toast(t('toast.cancelled'), { icon: XCircle, tone: 'error' });
      },
      onError: (error) => {
        setConfirmVisible(false);
        toast(error.message || t('order.cancelOrder'), { tone: 'error' });
      },
    });
  }, [cancelOrder, orderId, t]);

  if (isLoading) {
    return <LoadingState onBack={goBack} topInset={insets.top} />;
  }

  if (isError || !order) {
    return (
      <View style={styles.flex}>
        <AmbientBackground />
        <View style={[styles.flex, { paddingTop: insets.top }]}>
          <View style={styles.topBar}>
            <IconButton icon={ChevronLeft} accessibilityLabel={t('common.back')} onPress={goBack} variant="surface" />
          </View>
          <View style={styles.centerState}>
            <EmptyState
              icon={Receipt}
              title={t('history.empty')}
              body={t('history.emptySub')}
              cta={{ label: t('common.back'), onPress: goBack }}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <Content
      order={order}
      tracking={tracking}
      topInset={insets.top}
      bottomInset={insets.bottom}
      confirmVisible={confirmVisible}
      cancelling={cancelOrder.isPending}
      onBack={goBack}
      onRequestCancel={openConfirm}
      onCloseConfirm={closeConfirm}
      onConfirmCancel={doCancel}
    />
  );
}

interface ContentProps {
  order: Order;
  tracking: ReturnType<typeof useOrderTracking>;
  topInset: number;
  bottomInset: number;
  confirmVisible: boolean;
  cancelling: boolean;
  onBack: () => void;
  onRequestCancel: () => void;
  onCloseConfirm: () => void;
  onConfirmCancel: () => void;
}

function Content({
  order,
  tracking,
  topInset,
  bottomInset,
  confirmVisible,
  cancelling,
  onBack,
  onRequestCancel,
  onCloseConfirm,
  onConfirmCancel,
}: ContentProps) {
  const tokens = useThemeTokens();
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const { data: shop } = useShop(order.shopId);

  const sequence = order.pickupMode === PickupMode.SLOT ? TIMELINE_SLOT : TIMELINE_QUEUE;
  const canCancel = CANCELLABLE.has(order.status);
  const showLive = LIVE_STATUSES.has(order.status);
  const showReconnecting = order.status === OrderStatus.PROCESSING && !tracking.connected;
  const shopName = shop?.name ?? '';
  const position = tracking.position;
  const etaMins = tracking.etaMins;

  const collectedNote =
    order.status === OrderStatus.READY || order.status === OrderStatus.COLLECTED
      ? t('order.collectedNote')
      : undefined;

  return (
    <View style={styles.flex}>
      <AmbientBackground />
      <View style={[styles.flex, { paddingTop: topInset }]}>
        <View style={styles.topBar}>
          <IconButton icon={ChevronLeft} accessibilityLabel={t('common.back')} onPress={onBack} variant="surface" />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
        >
          <FrostCard pad={20}>
            <View style={styles.hero}>
              <View style={styles.heroTop}>
                <Text variant="h1" color="textPrimary" style={styles.orderNumber}>
                  {order.orderNumber}
                </Text>
                <StatusBadge status={order.status} />
              </View>
              {shopName ? (
                <Text variant="bodySm" color="textSecondary">{shopName}</Text>
              ) : null}
            </View>
          </FrostCard>

          {showReconnecting ? (
            <Banner tone="warn" icon={WifiOff} testID="order-detail-reconnecting">
              {t('order.disconnected')}
            </Banner>
          ) : null}

          {showLive && position != null ? (
            <FrostCard pad={16}>
              <View style={styles.liveRow}>
                <View style={styles.liveLeft}>
                  <View style={[styles.liveDot, { backgroundColor: tokens.success }]} />
                  <Text variant="body" color="textPrimary" style={styles.semibold}>
                    {t('order.position', { p: localizeDigits(position, language) })}
                  </Text>
                </View>
                {etaMins != null ? (
                  <Text variant="h3" color="primary" tabular>
                    {t('order.eta', { m: localizeDigits(etaMins, language) })}
                  </Text>
                ) : null}
              </View>
            </FrostCard>
          ) : null}

          <View style={styles.section}>
            <Text variant="h3" color="textPrimary">{t('order.timeline')}</Text>
            <Card>
              <Timeline
                sequence={sequence}
                current={order.status}
                currentNote={collectedNote}
                cancelledNote={t('order.cancelledNote')}
              />
            </Card>
          </View>

          <View style={styles.section}>
            <Text variant="h3" color="textPrimary">{t('order.shop')}</Text>
            <Card>
              <View style={styles.shopRow}>
                <Avatar name={shopName || '?'} size="sm" rounded />
                <View style={styles.grow}>
                  <Text variant="body" color="textPrimary" style={styles.semibold} numberOfLines={1}>
                    {shopName || order.shopId}
                  </Text>
                  {shop?.address ? (
                    <View style={styles.metaRow}>
                      <MapPin size={12} color={tokens.textMuted} />
                      <Text variant="caption" color="textSecondary" style={styles.grow} numberOfLines={1}>
                        {shop.address}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </Card>
          </View>

          <View style={styles.section}>
            <Text variant="h3" color="textPrimary">{t('order.filesTitle')}</Text>
            <View style={styles.fileList}>
              {order.orderFiles.map((file) => (
                <FileCard key={file.id} file={file} />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text variant="h3" color="textPrimary">{t('order.payment')}</Text>
            <Card>
              <KeyValue
                label={t('order.method')}
                value={
                  order.paymentMethod === PaymentMethod.WALLET
                    ? t('wizard.payWallet')
                    : t('wizard.payCash')
                }
              />
              <KeyValue label={t('order.total')} emphasis last>
                <MoneyText amount={Number(order.totalPrice)} variant="h3" color="primary" />
              </KeyValue>
            </Card>
          </View>

          {canCancel ? (
            <Button
              variant="danger"
              size="lg"
              onPress={onRequestCancel}
              disabled={cancelling}
              style={styles.cancelButton}
              testID="order-detail-cancel"
            >
              <ButtonIcon><XCircle size={18} color={tokens.onPrimary} /></ButtonIcon>
              <ButtonText>{t('order.cancelOrder')}</ButtonText>
            </Button>
          ) : null}
        </ScrollView>
      </View>

      <Sheet visible={confirmVisible} onClose={onCloseConfirm}>
        <View style={styles.sheet}>
          <View style={[styles.sheetIcon, { backgroundColor: tokens.tintSoft }]}>
            <XCircle size={26} color={tokens.error} />
          </View>
          <Text variant="h2" color="textPrimary" style={styles.sheetTitle}>
            {t('order.cancelConfirmTitle')}
          </Text>
          <Text variant="bodySm" color="textSecondary" style={styles.sheetBody}>
            {t('order.cancelConfirmBody')}
          </Text>
          <View style={[styles.sheetActions, { paddingBottom: bottomInset }]}>
            <View style={styles.grow}>
              <Button variant="secondary" size="lg" onPress={onCloseConfirm}>
                <ButtonText>{t('order.keepOrder')}</ButtonText>
              </Button>
            </View>
            <View style={styles.grow}>
              <Button
                variant="danger"
                size="lg"
                onPress={onConfirmCancel}
                disabled={cancelling}
                testID="order-detail-confirm-cancel"
              >
                <ButtonText>{t('order.confirmCancel')}</ButtonText>
              </Button>
            </View>
          </View>
        </View>
      </Sheet>
    </View>
  );
}

function FileCard({ file }: { file: OrderFile }) {
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);

  const chips = useMemo(() => {
    const parts = [
      file.colorMode === ColorMode.COLOR ? t('wizard.color') : t('wizard.bwShort'),
      file.paperSize,
      file.orientation === Orientation.PORTRAIT ? t('wizard.portrait') : t('wizard.landscape'),
      `${localizeDigits(file.copies, language)}×`,
    ];
    if (file.duplex) {
      parts.push(t('wizard.duplex'));
    }
    if (file.pageRange) {
      parts.push(localizeDigits(file.pageRange, language));
    }
    return parts;
  }, [file, language, t]);

  return (
    <Card>
      <View style={styles.fileTop}>
        <Text variant="body" color="textPrimary" style={[styles.semibold, styles.grow]} numberOfLines={1}>
          {file.fileName}
        </Text>
        <MoneyText amount={Number(file.subtotalPrice)} variant="body" color="textPrimary" style={styles.semibold} />
      </View>
      <View style={styles.chips}>
        {chips.map((label, index) => (
          <Chip key={`${label}-${index}`} label={label} />
        ))}
      </View>
    </Card>
  );
}

function LoadingState({ onBack, topInset }: { onBack: () => void; topInset: number }) {
  const { t } = useTranslation();
  return (
    <View style={styles.flex}>
      <AmbientBackground />
      <View style={[styles.flex, { paddingTop: topInset }]}>
        <View style={styles.topBar}>
          <IconButton icon={ChevronLeft} accessibilityLabel={t('common.back')} onPress={onBack} variant="surface" />
        </View>
        <View style={styles.scroll}>
          <FrostCard pad={20}>
            <View style={styles.heroSkel}>
              <Skeleton width="50%" height={28} />
              <Skeleton width="70%" height={14} />
            </View>
          </FrostCard>
          <Card>
            <View style={styles.heroSkel}>
              <Skeleton width="40%" height={16} />
              <Skeleton width="100%" height={14} />
              <Skeleton width="100%" height={14} />
            </View>
          </Card>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grow: { flex: 1 },
  semibold: { fontWeight: '600' },
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
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  hero: {
    gap: spacing.sm,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  orderNumber: {
    flex: 1,
  },
  heroSkel: {
    gap: spacing.md,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  liveLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  liveDot: {
    width: 9,
    height: 9,
    borderRadius: 9999,
  },
  section: {
    gap: spacing.md,
  },
  shopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  fileList: {
    gap: spacing.md,
  },
  fileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  cancelButton: {
    marginTop: spacing.sm,
  },
  sheet: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  sheetIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  sheetBody: {
    textAlign: 'center',
  },
  sheetActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    alignSelf: 'stretch',
  },
});
