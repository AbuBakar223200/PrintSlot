import React, { useCallback, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import {
  PaymentMethod,
  PickupMode,
  type CreateOrderFileInput,
  type CreateOrderInput,
  type PreviewPriceFileInput,
  type PreviewPriceInput,
  type PricedOrderFile,
} from '@printslot/shared';
import { AmbientBackground, Button, ButtonText, Card, Sheet, Text } from '@/components/ui';
import { radii, spacing, useThemeTokens } from '@/theme';
import { FilePickerSection } from '@/features/upload/components/FilePickerSection';
import { SlotPicker } from '@/features/slots/components/SlotPicker';
import { useWalletBalance } from '@/features/wallet/hooks/useWallet';
import { formatCurrency } from '@/utils/formatCurrency';
import { useCreateOrder, usePreviewPrice } from '../hooks/useOrders';
import {
  orderWizardKeys,
  orderWizardText,
} from '../i18n/orderWizardCopy';
import {
  type OrderWizardMode,
  type OrderWizardPaymentMethod,
  type OrderWizardStep,
  useOrderWizardStore,
} from '../store/orderStore';
import type { WizardFile } from '../../upload/types';

export interface OrderCreationWizardScreenProps {
  shopId: string;
  mode: OrderWizardMode | null;
}

type ApiStatusError = Error & { statusCode?: number };
type WizardSheet = {
  title: string;
  body: string;
  primaryLabel?: string;
  primaryAction?: () => void;
  danger?: boolean;
} | null;

type PreviewRow = {
  id: string;
  fileName: string;
  pricedFile: PricedOrderFile;
};

function hasUsablePageCount(file: WizardFile): boolean {
  return (file.upload?.detectedPages ?? file.manualPages) !== null;
}

function isWizardFileReady(file: WizardFile): boolean {
  return file.uploadStatus === 'done'
    && file.upload !== null
    && file.configValid === true
    && hasUsablePageCount(file);
}

function normalizedPreviewPageRange(pageRange: string | null): string | undefined {
  const trimmed = pageRange?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizedCreatePageRange(pageRange: string | null): string | null {
  const trimmed = pageRange?.trim();
  return trimmed ? trimmed : null;
}

function wizardFileToPreviewFile(file: WizardFile): PreviewPriceFileInput | null {
  const detectedPages = file.upload?.detectedPages ?? file.manualPages;

  if (detectedPages === null) {
    return null;
  }

  return {
    detectedPages,
    colorMode: file.config.colorMode,
    paperSize: file.config.paperSize,
    copies: file.config.copies,
    duplex: file.config.duplex,
    pageRange: normalizedPreviewPageRange(file.config.pageRange),
  };
}

function wizardFileToCreateFile(file: WizardFile): CreateOrderFileInput | null {
  const upload = file.upload;
  const detectedPages = upload?.detectedPages ?? file.manualPages;

  if (!upload || detectedPages === null) {
    return null;
  }

  return {
    fileUrl: upload.fileUrl,
    fileName: upload.fileName,
    mimeType: upload.mimeType,
    fileSize: upload.fileSize,
    detectedPages,
    colorMode: file.config.colorMode,
    paperSize: file.config.paperSize,
    orientation: file.config.orientation,
    copies: file.config.copies,
    duplex: file.config.duplex,
    pageRange: normalizedCreatePageRange(file.config.pageRange),
  };
}

function buildPreviewInput(shopId: string, files: WizardFile[]): PreviewPriceInput | null {
  const mappedFiles = files.map(wizardFileToPreviewFile);

  if (mappedFiles.some((file) => file === null)) {
    return null;
  }

  return {
    shopId,
    files: mappedFiles as PreviewPriceFileInput[],
  };
}

function buildCreateInput(
  shopId: string,
  mode: OrderWizardMode,
  slotId: string | null,
  paymentMethod: OrderWizardPaymentMethod | null,
  files: WizardFile[],
): CreateOrderInput | null {
  if (!paymentMethod) {
    return null;
  }

  if (mode === PickupMode.SLOT && !slotId) {
    return null;
  }

  const mappedFiles = files.map(wizardFileToCreateFile);

  if (mappedFiles.some((file) => file === null)) {
    return null;
  }

  return {
    shopId,
    pickupMode: mode === PickupMode.SLOT ? PickupMode.SLOT : PickupMode.QUEUE,
    slotId: mode === PickupMode.SLOT ? slotId ?? undefined : undefined,
    paymentMethod: paymentMethod === PaymentMethod.WALLET
      ? PaymentMethod.WALLET
      : PaymentMethod.CASH,
    files: mappedFiles as CreateOrderFileInput[],
  };
}

function previousStep(step: OrderWizardStep, mode: OrderWizardMode | null): OrderWizardStep | null {
  if (step === 4) {
    return 3;
  }

  if (step === 3) {
    return 2;
  }

  if (step === 2 && mode === 'SLOT') {
    return 1;
  }

  return null;
}

function stepTitle(step: OrderWizardStep): string {
  if (step === 1) {
    return orderWizardText(orderWizardKeys.stepSlotTitle);
  }

  if (step === 2) {
    return orderWizardText(orderWizardKeys.stepFilesTitle);
  }

  if (step === 3) {
    return orderWizardText(orderWizardKeys.stepPreviewTitle);
  }

  return orderWizardText(orderWizardKeys.stepPaymentTitle);
}

function stepBody(step: OrderWizardStep): string {
  if (step === 1) {
    return orderWizardText(orderWizardKeys.stepSlotBody);
  }

  if (step === 2) {
    return orderWizardText(orderWizardKeys.stepFilesBody);
  }

  if (step === 3) {
    return orderWizardText(orderWizardKeys.stepPreviewBody);
  }

  return orderWizardText(orderWizardKeys.stepPaymentBody);
}

export function OrderCreationWizardScreen({
  shopId,
  mode,
}: OrderCreationWizardScreenProps) {
  const tokens = useThemeTokens();
  const [sheet, setSheet] = React.useState<WizardSheet>(null);
  const storeShopId = useOrderWizardStore((state) => state.shopId);
  const storeMode = useOrderWizardStore((state) => state.mode);
  const step = useOrderWizardStore((state) => state.step);
  const slotId = useOrderWizardStore((state) => state.slotId);
  const files = useOrderWizardStore((state) => state.files);
  const paymentMethod = useOrderWizardStore((state) => state.paymentMethod);
  const totalPrice = useOrderWizardStore((state) => state.totalPrice);
  const init = useOrderWizardStore((state) => state.init);
  const setSlot = useOrderWizardStore((state) => state.setSlot);
  const addFile = useOrderWizardStore((state) => state.addFile);
  const updateFile = useOrderWizardStore((state) => state.updateFile);
  const removeFile = useOrderWizardStore((state) => state.removeFile);
  const setPaymentMethod = useOrderWizardStore((state) => state.setPaymentMethod);
  const setStep = useOrderWizardStore((state) => state.setStep);
  const setPreview = useOrderWizardStore((state) => state.setPreview);
  const reset = useOrderWizardStore((state) => state.reset);
  const {
    data: previewData,
    error: previewError,
    isPending: isPreviewPending,
    mutate: previewPrice,
  } = usePreviewPrice();
  const {
    isPending: isCreatePending,
    mutate: createOrder,
  } = useCreateOrder();
  const walletBalance = useWalletBalance();

  useEffect(() => {
    if (!shopId || !mode) {
      return;
    }

    init(shopId, mode);
  }, [init, mode, shopId]);

  useEffect(() => {
    if (mode === 'QUEUE' && step === 1) {
      setStep(2);
    }
  }, [mode, setStep, step]);

  const discardAndBack = useCallback(() => {
    setSheet(null);
    reset();
    router.back();
  }, [reset]);

  const confirmDiscard = useCallback(() => {
    setSheet({
      title: orderWizardText(orderWizardKeys.discardTitle),
      body: orderWizardText(orderWizardKeys.discardBody),
      primaryLabel: orderWizardText(orderWizardKeys.discard),
      primaryAction: discardAndBack,
      danger: true,
    });
  }, [discardAndBack]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 1) {
        return false;
      }

      confirmDiscard();
      return true;
    });

    return () => {
      subscription.remove();
    };
  }, [confirmDiscard, step]);

  const filesReady = useMemo(() => (
    files.length >= 1 && files.every(isWizardFileReady)
  ), [files]);

  const previewInput = useMemo(() => {
    if (!storeShopId || !filesReady) {
      return null;
    }

    return buildPreviewInput(storeShopId, files);
  }, [files, filesReady, storeShopId]);

  useEffect(() => {
    if (step !== 3 || !previewInput) {
      return;
    }

    previewPrice(previewInput, {
      onSuccess: (result) => {
        setPreview(result.totalPrice);
      },
    });
  }, [previewInput, previewPrice, setPreview, step]);

  const createInput = useMemo(() => {
    if (!storeShopId || !storeMode || !filesReady) {
      return null;
    }

    return buildCreateInput(storeShopId, storeMode, slotId, paymentMethod, files);
  }, [files, filesReady, paymentMethod, slotId, storeMode, storeShopId]);

  const previewRows = useMemo<PreviewRow[]>(() => {
    if (!previewData) {
      return [];
    }

    return previewData.files.map((pricedFile, index) => ({
      id: files[index]?.localId ?? `preview-${index}`,
      fileName: files[index]?.upload?.fileName ?? files[index]?.localFile.name ?? '',
      pricedFile,
    }));
  }, [files, previewData]);

  const goPrevious = useCallback(() => {
    const nextStep = previousStep(step, storeMode);

    if (nextStep === null) {
      confirmDiscard();
      return;
    }

    setStep(nextStep);
  }, [confirmDiscard, setStep, step, storeMode]);

  const goNext = useCallback(() => {
    if (step === 1) {
      setStep(2);
      return;
    }

    if (step === 2) {
      setStep(3);
      return;
    }

    if (step === 3 && previewData) {
      setStep(4);
    }
  }, [previewData, setStep, step]);

  const openWallet = useCallback(() => {
    setSheet(null);
    router.push('/(customer)/wallet');
  }, []);

  const showCreateError = useCallback((error: ApiStatusError) => {
    if (error.statusCode === 402) {
      setSheet({
        title: orderWizardText(orderWizardKeys.insufficientTitle),
        body: orderWizardText(orderWizardKeys.insufficientBody),
        primaryLabel: orderWizardText(orderWizardKeys.topUpWallet),
        primaryAction: openWallet,
      });
      return;
    }

    if (error.statusCode === 409) {
      setSheet({
        title: orderWizardText(orderWizardKeys.slotFullTitle),
        body: orderWizardText(orderWizardKeys.slotFullBody),
      });
      setStep(1);
      return;
    }

    if (error.statusCode === 400) {
      const message = error.message.toLowerCase();
      const isShopInactive = message.includes('shop') && message.includes('active');
      setSheet({
        title: isShopInactive
          ? orderWizardText(orderWizardKeys.shopUnavailableTitle)
          : orderWizardText(orderWizardKeys.noActiveSlotTitle),
        body: isShopInactive
          ? orderWizardText(orderWizardKeys.shopUnavailableBody)
          : orderWizardText(orderWizardKeys.noActiveSlotBody),
      });
      return;
    }

    setSheet({
      title: orderWizardText(orderWizardKeys.genericErrorTitle),
      body: orderWizardText(orderWizardKeys.genericErrorBody),
    });
  }, [openWallet, setStep]);

  const placeOrder = useCallback(() => {
    if (!createInput) {
      return;
    }

    createOrder(createInput, {
      onSuccess: (order) => {
        router.replace(`/(customer)/orders/${order.id}`);
        reset();
      },
      onError: (error) => {
        showCreateError(error as ApiStatusError);
      },
    });
  }, [createInput, createOrder, reset, showCreateError]);

  const selectWallet = useCallback(() => {
    setPaymentMethod('WALLET');
  }, [setPaymentMethod]);

  const selectCash = useCallback(() => {
    setPaymentMethod('CASH');
  }, [setPaymentMethod]);

  const totalRowStyle = [
    styles.totalRow,
    { backgroundColor: tokens.surface, borderColor: tokens.border },
  ];
  const walletBalanceValue = walletBalance.data?.balance ?? 0;

  const renderPreviewRow = useCallback<ListRenderItem<PreviewRow>>(({ item }) => (
    <View style={[styles.previewRow, { borderBottomColor: tokens.border }]}>
      <View style={styles.previewRowText}>
        <Text numberOfLines={1} variant="body" color="textPrimary" style={styles.semibold}>
          {item.fileName}
        </Text>
        <Text variant="caption" color="textSecondary">
          {orderWizardText(orderWizardKeys.fileSubtotal, {
            name: item.fileName,
            pages: item.pricedFile.resolvedPages,
          })}
        </Text>
      </View>
      <Text variant="bodySm" color="textPrimary" tabular style={styles.bold}>
        {formatCurrency(item.pricedFile.subtotalPrice)}
      </Text>
    </View>
  ), [tokens.border]);

  const keyPreviewRow = useCallback((item: PreviewRow) => item.id, []);

  if (!shopId || !mode) {
    return (
      <View style={styles.container}>
        <AmbientBackground />
        <View style={styles.centerState}>
          <Text variant="h2" color="textPrimary" align="center">
            {orderWizardText(orderWizardKeys.invalidTitle)}
          </Text>
          <Text variant="bodySm" color="textSecondary" align="center">
            {orderWizardText(orderWizardKeys.invalidBody)}
          </Text>
          <Button onPress={discardAndBack} variant="secondary" testID="order-wizard-invalid-back">
            <ButtonText>{orderWizardText(orderWizardKeys.back)}</ButtonText>
          </Button>
        </View>
      </View>
    );
  }

  const canGoNext = step === 1
    ? slotId !== null
    : step === 2
      ? filesReady
      : step === 3
        ? previewData !== undefined && !isPreviewPending
        : false;
  const walletSelected = paymentMethod === 'WALLET';
  const cashSelected = paymentMethod === 'CASH';
  const walletDisabled = totalPrice !== null && walletBalanceValue < totalPrice;
  const placeOrderDisabled = createInput === null || isCreatePending || (walletSelected && walletDisabled);

  return (
    <View style={styles.container}>
      <AmbientBackground />
      <View style={[styles.header, { borderBottomColor: tokens.border }]}>
        <View>
          <Text variant="h2" color="textPrimary">{orderWizardText(orderWizardKeys.title)}</Text>
          <Text variant="bodySm" color="textSecondary" style={styles.semibold} testID="order-wizard-progress">
            {orderWizardText(orderWizardKeys.progress, { step, totalSteps: 4 })}
          </Text>
        </View>
        <Pressable
          accessibilityLabel={orderWizardText(orderWizardKeys.cancel)}
          accessibilityRole="button"
          onPress={confirmDiscard}
          style={[styles.cancelButton, { borderColor: tokens.border }]}
          testID="order-wizard-cancel"
        >
          <Text variant="bodySm" color="primary" style={styles.bold}>
            {orderWizardText(orderWizardKeys.cancel)}
          </Text>
        </Pressable>
      </View>
      <View style={styles.progressBars} accessibilityLabel="Order progress">
        {[1, 2, 3, 4].map((item) => (
          <View
            key={item}
            style={[
              styles.progressBar,
              { backgroundColor: item <= step ? tokens.primary : tokens.border },
            ]}
          />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepHeader}>
          <Text variant="h1" color="textPrimary">{stepTitle(step)}</Text>
          <Text variant="body" color="textSecondary">{stepBody(step)}</Text>
        </View>

        {step === 1 ? (
          <Card style={styles.section}>
            <SlotPicker shopId={shopId} value={slotId} onChange={setSlot} />
          </Card>
        ) : null}

        {step === 2 ? (
          <Card style={styles.section}>
            <FilePickerSection
              files={files}
              maxFiles={10}
              onAdd={addFile}
              onChange={updateFile}
              onRemove={removeFile}
            />
          </Card>
        ) : null}

        {step === 3 ? (
          <Card style={styles.section}>
            {isPreviewPending ? (
              <View style={styles.stateInline}>
                <ActivityIndicator color={tokens.primary} />
                <Text variant="bodySm" color="textSecondary" align="center">
                  {orderWizardText(orderWizardKeys.previewLoading)}
                </Text>
              </View>
            ) : null}

            {previewError ? (
              <View style={[styles.errorBox, { backgroundColor: tokens.surface, borderColor: tokens.error }]}>
                <Text variant="bodySm" color="error" style={styles.bold}>
                  {orderWizardText(orderWizardKeys.previewErrorTitle)}
                </Text>
                <Text variant="bodySm" color="textSecondary">{previewError.message}</Text>
              </View>
            ) : null}

            {previewRows.length > 0 ? (
              <FlashList
                data={previewRows}
                estimatedItemSize={72}
                keyExtractor={keyPreviewRow}
                renderItem={renderPreviewRow}
                scrollEnabled={false}
              />
            ) : null}

            {previewData ? (
              <View style={totalRowStyle}>
                <Text variant="body" color="textSecondary" style={styles.semibold}>
                  {orderWizardText(orderWizardKeys.total)}
                </Text>
                <Text variant="h2" color="primary" tabular>
                  {formatCurrency(previewData.totalPrice)}
                </Text>
              </View>
            ) : null}
          </Card>
        ) : null}

        {step === 4 ? (
          <Card style={styles.section}>
            <Pressable
              accessibilityLabel={orderWizardText(orderWizardKeys.wallet)}
              accessibilityRole="button"
              disabled={walletDisabled}
              onPress={selectWallet}
              style={({ pressed }) => [
                styles.paymentCard,
                { backgroundColor: tokens.surface, borderColor: tokens.border },
                walletSelected ? { borderColor: tokens.primary, borderWidth: 2 } : null,
                walletDisabled ? styles.disabledPayment : null,
                pressed ? styles.paymentCardPressed : null,
              ]}
              testID="order-wizard-wallet"
            >
              <Text variant="h3" color="textPrimary">{orderWizardText(orderWizardKeys.wallet)}</Text>
              <Text variant="bodySm" color="textSecondary">
                {orderWizardText(orderWizardKeys.walletBalance, {
                  amount: formatCurrency(walletBalanceValue),
                })}
              </Text>
              {walletDisabled ? (
                <Text variant="caption" color="warn">
                  {orderWizardText(orderWizardKeys.insufficientTitle)}
                </Text>
              ) : null}
            </Pressable>

            <Pressable
              accessibilityLabel={orderWizardText(orderWizardKeys.cash)}
              accessibilityRole="button"
              onPress={selectCash}
              style={({ pressed }) => [
                styles.paymentCard,
                { backgroundColor: tokens.surface, borderColor: tokens.border },
                cashSelected ? { borderColor: tokens.primary, borderWidth: 2 } : null,
                pressed ? styles.paymentCardPressed : null,
              ]}
              testID="order-wizard-cash"
            >
              <Text variant="h3" color="textPrimary">{orderWizardText(orderWizardKeys.cash)}</Text>
              <Text variant="bodySm" color="textSecondary">{orderWizardText(orderWizardKeys.cashBody)}</Text>
            </Pressable>

            {totalPrice !== null ? (
              <View style={totalRowStyle}>
                <Text variant="body" color="textSecondary" style={styles.semibold}>
                  {orderWizardText(orderWizardKeys.total)}
                </Text>
                <Text variant="h2" color="primary" tabular>{formatCurrency(totalPrice)}</Text>
              </View>
            ) : null}
          </Card>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: tokens.surface, borderTopColor: tokens.border }]}>
        <Button
          onPress={goPrevious}
          size="md"
          style={styles.footerButton}
          testID="order-wizard-back"
          variant="secondary"
        >
          <ButtonText>{orderWizardText(orderWizardKeys.back)}</ButtonText>
        </Button>

        {step === 4 ? (
          <Button
            disabled={placeOrderDisabled}
            isLoading={isCreatePending}
            onPress={placeOrder}
            size="md"
            style={styles.footerButton}
            testID="order-wizard-place-order"
          >
            <ButtonText>{orderWizardText(orderWizardKeys.placeOrder)}</ButtonText>
          </Button>
        ) : (
          <Button
            disabled={!canGoNext}
            onPress={goNext}
            size="md"
            style={styles.footerButton}
            testID={step === 3 ? 'order-wizard-confirm' : 'order-wizard-next'}
          >
            <ButtonText>
              {step === 3
                ? orderWizardText(orderWizardKeys.confirm)
                : orderWizardText(orderWizardKeys.next)}
            </ButtonText>
          </Button>
        )}
      </View>
      <Sheet visible={sheet !== null} onClose={() => setSheet(null)}>
        {sheet ? (
          <View style={styles.sheetContent}>
            <Text variant="h2" color="textPrimary">{sheet.title}</Text>
            <Text variant="body" color="textSecondary">{sheet.body}</Text>
            <View style={styles.sheetActions}>
              <Button variant="secondary" onPress={() => setSheet(null)}>
                <ButtonText>{orderWizardText(orderWizardKeys.keepEditing)}</ButtonText>
              </Button>
              {sheet.primaryLabel ? (
                <Button variant={sheet.danger ? 'danger' : 'primary'} onPress={sheet.primaryAction}>
                  <ButtonText>{sheet.primaryLabel}</ButtonText>
                </Button>
              ) : null}
            </View>
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  bold: { fontWeight: '700' },
  semibold: { fontWeight: '600' },
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  progressBars: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  progressBar: {
    borderRadius: radii.full,
    flex: 1,
    height: 5,
  },
  cancelButton: {
    borderCurve: 'continuous',
    borderRadius: radii.control,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  scrollContent: {
    gap: spacing.lg,
    padding: spacing.xl,
    paddingBottom: spacing['3xl'],
  },
  stepHeader: {
    gap: spacing.xs,
  },
  section: {
    gap: spacing.lg,
  },
  centerState: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  stateInline: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  errorBox: {
    borderCurve: 'continuous',
    borderRadius: radii.control,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  previewRow: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 64,
    paddingVertical: spacing.md,
  },
  previewRowText: {
    flex: 1,
    gap: spacing.xs,
  },
  totalRow: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: radii.control,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  paymentCard: {
    borderCurve: 'continuous',
    borderRadius: radii.control,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  paymentCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  disabledPayment: {
    opacity: 0.52,
  },
  footer: {
    alignItems: 'center',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  footerButton: {
    flex: 1,
  },
  sheetContent: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  sheetActions: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});
