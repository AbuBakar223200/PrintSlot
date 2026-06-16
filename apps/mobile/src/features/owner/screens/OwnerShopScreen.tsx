import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, Check, Clock, RotateCcw, Store, XCircle } from 'lucide-react-native';
import { ShopStatus } from '@printslot/shared';
import {
  Avatar,
  Banner,
  Button,
  ButtonIcon,
  ButtonText,
  Card,
  Input,
  Screen,
  Skeleton,
  Text,
  toast,
} from '@/components/ui';
import { OwnerTabBar, OWNER_TAB_BAR_HEIGHT } from '@/components/shared/OwnerTabBar';
import { spacing, useThemeTokens } from '@/theme';
import {
  useCreateShop,
  useOwnerShop,
  useResubmitShop,
  useUpdateShop,
} from '@/features/owner/hooks/useOwnerShop';

interface ShopForm {
  name: string;
  phone: string;
  colorRate: string;
  bwRate: string;
}

export default function OwnerShopScreen() {
  const { t } = useTranslation();
  const tokens = useThemeTokens();
  const { data: shop, isLoading, isError } = useOwnerShop();
  const updateShop = useUpdateShop();
  const resubmit = useResubmitShop();

  const [form, setForm] = useState<ShopForm>({ name: '', phone: '', colorRate: '', bwRate: '' });

  useEffect(() => {
    if (shop) {
      setForm({
        name: shop.name,
        phone: shop.phone ?? '',
        colorRate: String(shop.colorRate),
        bwRate: String(shop.bwRate),
      });
    }
  }, [shop]);

  const openProfile = () => router.push('/(owner)/profile' as never);

  const status = shop?.status ?? ShopStatus.ACTIVE;
  const isRejected = status === ShopStatus.REJECTED;

  const onSave = () => {
    if (!shop) return;
    updateShop.mutate(
      {
        shopId: shop.id,
        input: {
          name: form.name,
          phone: form.phone || null,
          colorRate: Number(form.colorRate),
          bwRate: Number(form.bwRate),
        },
      },
      {
        onSuccess: () => toast(t('toast.saved'), { tone: 'success', icon: Check }),
        onError: (error) => toast(error.message, { tone: 'error' }),
      },
    );
  };

  const onResubmit = () => {
    if (!shop) return;
    resubmit.mutate(shop.id, {
      onSuccess: () => toast(t('toast.saved'), { tone: 'success', icon: RotateCcw }),
      onError: (error) => toast(error.message, { tone: 'error' }),
    });
  };

  return (
    <View style={styles.root}>
      <Screen contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.grow}>
            <Text variant="h1" color="textPrimary">{t('owner.shopTitle')}</Text>
          </View>
          <Pressable
            accessibilityLabel={t('tab.profile')}
            accessibilityRole="button"
            hitSlop={8}
            onPress={openProfile}
            testID="owner-profile-button"
          >
            <Avatar name={shop?.name ?? 'Shop'} size="md" />
          </Pressable>
        </View>

        {isLoading ? (
          <Card style={styles.skeletonCard}>
            <Skeleton width="40%" height={18} />
            <Skeleton width="100%" height={50} />
            <Skeleton width="100%" height={50} />
          </Card>
        ) : isError ? (
          <Banner tone="error" icon={XCircle}>{t('owner.rejectedBanner')}</Banner>
        ) : !shop ? (
          <CreateShopForm />
        ) : (
          <>
            <StatusBanner status={status} />

            {isRejected ? (
              <Button onPress={onResubmit} isLoading={resubmit.isPending} testID="owner-resubmit">
                <ButtonIcon><RotateCcw size={18} color={tokens.onPrimary} /></ButtonIcon>
                <ButtonText>{t('owner.resubmit')}</ButtonText>
              </Button>
            ) : null}

            <Card style={styles.form}>
              <Input
                label={t('common.name')}
                value={form.name}
                editable={!isRejected}
                onChangeText={(name) => setForm((prev) => ({ ...prev, name }))}
              />
              <Input
                label={t('shop.phone')}
                value={form.phone}
                editable={!isRejected}
                keyboardType="phone-pad"
                onChangeText={(phone) => setForm((prev) => ({ ...prev, phone }))}
              />
              <View style={styles.ratesField}>
                <Text variant="label" color="textSecondary" style={styles.ratesLabel}>
                  {t('owner.rates')}
                </Text>
                <View style={styles.ratesRow}>
                  <Input
                    containerStyle={styles.rateInput}
                    value={form.colorRate}
                    editable={!isRejected}
                    keyboardType="decimal-pad"
                    onChangeText={(colorRate) => setForm((prev) => ({ ...prev, colorRate }))}
                  />
                  <Input
                    containerStyle={styles.rateInput}
                    value={form.bwRate}
                    editable={!isRejected}
                    keyboardType="decimal-pad"
                    onChangeText={(bwRate) => setForm((prev) => ({ ...prev, bwRate }))}
                  />
                </View>
              </View>
              <Button
                size="sm"
                onPress={onSave}
                disabled={isRejected}
                isLoading={updateShop.isPending}
                testID="owner-save-shop"
              >
                <ButtonIcon><Check size={16} color={tokens.onPrimary} /></ButtonIcon>
                <ButtonText>{t('common.save')}</ButtonText>
              </Button>
            </Card>
          </>
        )}
      </Screen>
      <OwnerTabBar active="shop" />
    </View>
  );
}

interface CreateShopForm {
  name: string;
  address: string;
  phone: string;
  colorRate: string;
  bwRate: string;
  a3Surcharge: string;
  duplexDiscount: string;
}

const EMPTY_CREATE_FORM: CreateShopForm = {
  name: '',
  address: '',
  phone: '',
  colorRate: '',
  bwRate: '',
  a3Surcharge: '',
  duplexDiscount: '',
};

/**
 * Shown when the signed-in owner has no shop yet. Collects the fields required by
 * `POST /shops` and submits a request — the shop is created PENDING admin approval.
 */
function CreateShopForm() {
  const { t } = useTranslation();
  const tokens = useThemeTokens();
  const createShop = useCreateShop();
  const [form, setForm] = useState<CreateShopForm>(EMPTY_CREATE_FORM);

  const canSubmit =
    form.name.trim().length > 0 &&
    form.address.trim().length > 0 &&
    Number(form.colorRate) > 0 &&
    Number(form.bwRate) > 0;

  const onSubmit = () => {
    if (!canSubmit) return;
    createShop.mutate(
      {
        name: form.name.trim(),
        address: form.address.trim(),
        phone: form.phone.trim() || undefined,
        colorRate: Number(form.colorRate),
        bwRate: Number(form.bwRate),
        a3Surcharge: Number(form.a3Surcharge) || 0,
        duplexDiscount: Number(form.duplexDiscount) || 0,
      },
      {
        onSuccess: () => toast(t('toast.shopRequested'), { tone: 'success', icon: Check }),
        onError: (error) => toast(error.message, { tone: 'error' }),
      },
    );
  };

  return (
    <>
      <Banner tone="info" icon={Store}>{t('owner.createShopIntro')}</Banner>
      <Card style={styles.form}>
        <Input
          label={t('owner.shopName')}
          value={form.name}
          onChangeText={(name) => setForm((prev) => ({ ...prev, name }))}
          testID="owner-create-name"
        />
        <Input
          label={t('owner.shopAddress')}
          value={form.address}
          onChangeText={(address) => setForm((prev) => ({ ...prev, address }))}
          testID="owner-create-address"
        />
        <Input
          label={t('owner.shopPhone')}
          value={form.phone}
          keyboardType="phone-pad"
          onChangeText={(phone) => setForm((prev) => ({ ...prev, phone }))}
          testID="owner-create-phone"
        />
        <View style={styles.ratesRow}>
          <Input
            containerStyle={styles.rateInput}
            label={t('shop.color')}
            value={form.colorRate}
            keyboardType="decimal-pad"
            onChangeText={(colorRate) => setForm((prev) => ({ ...prev, colorRate }))}
            testID="owner-create-color-rate"
          />
          <Input
            containerStyle={styles.rateInput}
            label={t('shop.bw')}
            value={form.bwRate}
            keyboardType="decimal-pad"
            onChangeText={(bwRate) => setForm((prev) => ({ ...prev, bwRate }))}
            testID="owner-create-bw-rate"
          />
        </View>
        <View style={styles.ratesRow}>
          <Input
            containerStyle={styles.rateInput}
            label={t('shop.a3')}
            value={form.a3Surcharge}
            keyboardType="decimal-pad"
            onChangeText={(a3Surcharge) => setForm((prev) => ({ ...prev, a3Surcharge }))}
            testID="owner-create-a3"
          />
          <Input
            containerStyle={styles.rateInput}
            label={t('shop.duplex')}
            value={form.duplexDiscount}
            keyboardType="decimal-pad"
            onChangeText={(duplexDiscount) => setForm((prev) => ({ ...prev, duplexDiscount }))}
            testID="owner-create-duplex"
          />
        </View>
        <Button
          onPress={onSubmit}
          disabled={!canSubmit}
          isLoading={createShop.isPending}
          testID="owner-create-shop"
        >
          <ButtonIcon><Store size={18} color={tokens.onPrimary} /></ButtonIcon>
          <ButtonText>{t('owner.createShopCta')}</ButtonText>
        </Button>
      </Card>
    </>
  );
}

function StatusBanner({ status }: { status: ShopStatus }) {
  const { t } = useTranslation();
  if (status === ShopStatus.PENDING) {
    return <Banner tone="warn" icon={Clock}>{t('owner.pendingBanner')}</Banner>;
  }
  if (status === ShopStatus.REJECTED) {
    return <Banner tone="error" icon={XCircle}>{t('owner.rejectedBanner')}</Banner>;
  }
  if (status === ShopStatus.SUSPENDED) {
    return <Banner tone="warn" icon={Clock}>{t('owner.pendingBanner')}</Banner>;
  }
  return <Banner tone="success" icon={BadgeCheck}>{t('owner.shopActive')}</Banner>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: OWNER_TAB_BAR_HEIGHT + spacing.lg,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  grow: {
    flex: 1,
  },
  skeletonCard: {
    gap: spacing.md,
  },
  form: {
    gap: spacing.md,
  },
  ratesField: {
    gap: 6,
  },
  ratesLabel: {
    marginLeft: 2,
  },
  ratesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rateInput: {
    flex: 1,
  },
});
