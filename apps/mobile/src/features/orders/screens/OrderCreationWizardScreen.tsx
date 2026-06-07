import React, { useCallback, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
import { Button, ButtonText } from '@/components/ui/Button';
import { borderRadius, colors, spacing, typography } from '@/config/theme';
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
  const previewPrice = usePreviewPrice();
  const createOrder = useCreateOrder();
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
    reset();
    router.back();
  }, [reset]);

  const confirmDiscard = useCallback(() => {
    Alert.alert(
      orderWizardText(orderWizardKeys.discardTitle),
      orderWizardText(orderWizardKeys.discardBody),
      [
        { text: orderWizardText(orderWizardKeys.keepEditing), style: 'cancel' },
        {
          text: orderWizardText(orderWizardKeys.discard),
          style: 'destructive',
          onPress: discardAndBack,
        },
      ],
    );
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

    previewPrice.mutate(previewInput, {
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
    if (!previewPrice.data) {
      return [];
    }

    return previewPrice.data.files.map((pricedFile, index) => ({
      id: files[index]?.localId ?? `preview-${index}`,
      fileName: files[index]?.upload?.fileName ?? files[index]?.localFile.name ?? '',
      pricedFile,
    }));
  }, [files, previewPrice.data]);

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

    if (step === 3 && previewPrice.data) {
      setStep(4);
    }
  }, [previewPrice.data, setStep, step]);

  const openWallet = useCallback(() => {
    router.push('/(customer)/wallet');
  }, []);

  const showCreateError = useCallback((error: ApiStatusError) => {
    if (error.statusCode === 402) {
      Alert.alert(
        orderWizardText(orderWizardKeys.insufficientTitle),
        orderWizardText(orderWizardKeys.insufficientBody),
        [
          { text: orderWizardText(orderWizardKeys.keepEditing), style: 'cancel' },
          { text: orderWizardText(orderWizardKeys.topUpWallet), onPress: openWallet },
        ],
      );
      return;
    }

    if (error.statusCode === 409) {
      Alert.alert(
        orderWizardText(orderWizardKeys.slotFullTitle),
        orderWizardText(orderWizardKeys.slotFullBody),
      );
      setStep(1);
      return;
    }

    if (error.statusCode === 400) {
      const message = error.message.toLowerCase();
      const isShopInactive = message.includes('shop') && message.includes('active');
      Alert.alert(
        isShopInactive
          ? orderWizardText(orderWizardKeys.shopUnavailableTitle)
          : orderWizardText(orderWizardKeys.noActiveSlotTitle),
        isShopInactive
          ? orderWizardText(orderWizardKeys.shopUnavailableBody)
          : orderWizardText(orderWizardKeys.noActiveSlotBody),
      );
      return;
    }

    Alert.alert(
      orderWizardText(orderWizardKeys.genericErrorTitle),
      orderWizardText(orderWizardKeys.genericErrorBody),
    );
  }, [openWallet, setStep]);

  const placeOrder = useCallback(() => {
    if (!createInput) {
      return;
    }

    createOrder.mutate(createInput, {
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

  const renderPreviewRow = useCallback<ListRenderItem<PreviewRow>>(({ item }) => (
    <View style={styles.previewRow}>
      <View style={styles.previewRowText}>
        <Text numberOfLines={1} style={styles.previewFileName}>{item.fileName}</Text>
        <Text style={styles.previewMeta}>
          {orderWizardText(orderWizardKeys.fileSubtotal, {
            name: item.fileName,
            pages: item.pricedFile.resolvedPages,
          })}
        </Text>
      </View>
      <Text style={styles.previewAmount}>
        {formatCurrency(item.pricedFile.subtotalPrice)}
      </Text>
    </View>
  ), []);

  const keyPreviewRow = useCallback((item: PreviewRow) => item.id, []);

  if (!shopId || !mode) {
    return (
      <View style={styles.container}>
        <View style={styles.centerState}>
          <Text style={styles.stateTitle}>{orderWizardText(orderWizardKeys.invalidTitle)}</Text>
          <Text style={styles.stateText}>{orderWizardText(orderWizardKeys.invalidBody)}</Text>
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
        ? previewPrice.data !== undefined && !previewPrice.isPending
        : false;
  const walletSelected = paymentMethod === 'WALLET';
  const cashSelected = paymentMethod === 'CASH';
  const placeOrderDisabled = createInput === null || createOrder.isPending;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{orderWizardText(orderWizardKeys.title)}</Text>
          <Text style={styles.progressText} testID="order-wizard-progress">
            {`${step} / 4`}
          </Text>
        </View>
        <Pressable
          accessibilityLabel={orderWizardText(orderWizardKeys.cancel)}
          accessibilityRole="button"
          onPress={confirmDiscard}
          style={styles.cancelButton}
          testID="order-wizard-cancel"
        >
          <Text style={styles.cancelText}>{orderWizardText(orderWizardKeys.cancel)}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>{stepTitle(step)}</Text>
          <Text style={styles.stepBody}>{stepBody(step)}</Text>
        </View>

        {step === 1 ? (
          <View style={styles.section}>
            <SlotPicker shopId={shopId} value={slotId} onChange={setSlot} />
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.section}>
            <FilePickerSection
              files={files}
              maxFiles={10}
              onAdd={addFile}
              onChange={updateFile}
              onRemove={removeFile}
            />
          </View>
        ) : null}

        {step === 3 ? (
          <View style={styles.section}>
            {previewPrice.isPending ? (
              <View style={styles.stateInline}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.stateText}>{orderWizardText(orderWizardKeys.previewLoading)}</Text>
              </View>
            ) : null}

            {previewPrice.error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorTitle}>
                  {orderWizardText(orderWizardKeys.previewErrorTitle)}
                </Text>
                <Text style={styles.errorText}>{previewPrice.error.message}</Text>
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

            {previewPrice.data ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{orderWizardText(orderWizardKeys.total)}</Text>
                <Text style={styles.totalValue}>
                  {formatCurrency(previewPrice.data.totalPrice)}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {step === 4 ? (
          <View style={styles.section}>
            <Pressable
              accessibilityLabel={orderWizardText(orderWizardKeys.wallet)}
              accessibilityRole="button"
              onPress={selectWallet}
              style={({ pressed }) => [
                styles.paymentCard,
                walletSelected ? styles.paymentCardSelected : null,
                pressed ? styles.paymentCardPressed : null,
              ]}
              testID="order-wizard-wallet"
            >
              <Text style={styles.paymentTitle}>{orderWizardText(orderWizardKeys.wallet)}</Text>
              <Text style={styles.paymentBody}>
                {orderWizardText(orderWizardKeys.walletBalance, {
                  amount: formatCurrency(walletBalance.data?.balance ?? 0),
                })}
              </Text>
            </Pressable>

            <Pressable
              accessibilityLabel={orderWizardText(orderWizardKeys.cash)}
              accessibilityRole="button"
              onPress={selectCash}
              style={({ pressed }) => [
                styles.paymentCard,
                cashSelected ? styles.paymentCardSelected : null,
                pressed ? styles.paymentCardPressed : null,
              ]}
              testID="order-wizard-cash"
            >
              <Text style={styles.paymentTitle}>{orderWizardText(orderWizardKeys.cash)}</Text>
              <Text style={styles.paymentBody}>{orderWizardText(orderWizardKeys.cashBody)}</Text>
            </Pressable>

            {totalPrice !== null ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{orderWizardText(orderWizardKeys.total)}</Text>
                <Text style={styles.totalValue}>{formatCurrency(totalPrice)}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
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
            isLoading={createOrder.isPending}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  progressText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  cancelButton: {
    borderColor: colors.borderLight,
    borderCurve: 'continuous',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  cancelText: {
    ...typography.bodySm,
    color: colors.primary,
    fontWeight: '700',
  },
  scrollContent: {
    gap: spacing.lg,
    padding: spacing.xl,
    paddingBottom: spacing['3xl'],
  },
  stepHeader: {
    gap: spacing.xs,
  },
  stepTitle: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  stepBody: {
    ...typography.body,
    color: colors.textSecondary,
  },
  section: {
    backgroundColor: colors.glassBg,
    borderColor: colors.border,
    borderCurve: 'continuous',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.lg,
  },
  centerState: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
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
  stateInline: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  errorBox: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.error,
    borderCurve: 'continuous',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  errorTitle: {
    ...typography.bodySm,
    color: colors.error,
    fontWeight: '700',
  },
  errorText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  previewRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
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
  previewFileName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  previewMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  previewAmount: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  totalRow: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderCurve: 'continuous',
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  totalLabel: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  totalValue: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  paymentCard: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderLight,
    borderCurve: 'continuous',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  paymentCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  paymentCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  paymentTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  paymentBody: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  footer: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  footerButton: {
    flex: 1,
  },
});
