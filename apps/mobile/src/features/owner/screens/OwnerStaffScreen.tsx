import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { UserMinus, UserPlus, Users } from 'lucide-react-native';
import type { User } from '@printslot/shared';
import {
  Avatar,
  Button,
  ButtonIcon,
  ButtonText,
  Card,
  EmptyState,
  IconButton,
  Input,
  Screen,
  Sheet,
  Skeleton,
  Text,
  toast,
} from '@/components/ui';
import { OwnerTabBar, OWNER_TAB_BAR_HEIGHT } from '@/components/shared/OwnerTabBar';
import { spacing, useTheme, useThemeTokens } from '@/theme';
import { useOwnerShop } from '@/features/owner/hooks/useOwnerShop';
import {
  useAddStaff,
  useOwnerStaff,
  useRemoveStaff,
} from '@/features/owner/hooks/useOwnerStaff';

const SKELETON_ROWS = ['st1', 'st2'];

export default function OwnerStaffScreen() {
  const { t } = useTranslation();
  const { tones } = useTheme();
  const tokens = useThemeTokens();
  const { data: shop } = useOwnerShop();
  const shopId = shop?.id ?? null;

  const { data, isLoading, isError, refetch } = useOwnerStaff(shopId);
  const addStaff = useAddStaff();
  const removeStaff = useRemoveStaff();
  const staff = data ?? [];

  const [promoteId, setPromoteId] = useState('');
  const [pendingRemoval, setPendingRemoval] = useState<User | null>(null);

  const openProfile = useCallback(() => {
    router.push('/(owner)/profile' as never);
  }, []);

  const onAdd = useCallback(() => {
    const userId = promoteId.trim();
    if (!shopId || !userId) return;
    addStaff.mutate(
      { shopId, userId },
      {
        onSuccess: () => {
          setPromoteId('');
          toast(t('toast.staffAdded'), { tone: 'success', icon: UserPlus });
        },
        onError: (error) => toast(error.message, { tone: 'error' }),
      },
    );
  }, [addStaff, promoteId, shopId, t]);

  const onConfirmRemove = useCallback(() => {
    if (!shopId || !pendingRemoval) return;
    const userId = pendingRemoval.id;
    removeStaff.mutate(
      { shopId, userId },
      {
        onSuccess: () => {
          setPendingRemoval(null);
          toast(t('toast.staffRemoved'), { tone: 'success', icon: UserMinus });
        },
        onError: (error) => {
          setPendingRemoval(null);
          toast(error.message, { tone: 'error' });
        },
      },
    );
  }, [pendingRemoval, removeStaff, shopId, t]);

  return (
    <View style={styles.root}>
      <Screen contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.grow}>
            <Text variant="h1" color="textPrimary">{t('owner.staffTitle')}</Text>
          </View>
          <Pressable
            accessibilityLabel={t('tab.profile')}
            accessibilityRole="button"
            hitSlop={8}
            onPress={openProfile}
            testID="owner-staff-profile-button"
          >
            <Avatar name={shop?.name ?? 'Shop'} size="md" />
          </Pressable>
        </View>

        <Card style={styles.promoteCard}>
          <Input
            label={t('owner.promote')}
            placeholder={t('owner.userIdHint')}
            value={promoteId}
            autoCapitalize="none"
            onChangeText={setPromoteId}
            testID="owner-promote-input"
          />
          <Button
            size="sm"
            onPress={onAdd}
            disabled={!promoteId.trim()}
            isLoading={addStaff.isPending}
            testID="owner-add-staff"
          >
            <ButtonIcon><UserPlus size={16} color={tokens.onPrimary} /></ButtonIcon>
            <ButtonText>{t('common.add')}</ButtonText>
          </Button>
        </Card>

        {isLoading ? (
          <View style={styles.list}>
            {SKELETON_ROWS.map((id) => (
              <Card key={id} style={styles.skeletonRow}>
                <Skeleton width={42} height={42} radius={21} />
                <View style={styles.skeletonText}>
                  <Skeleton width="50%" height={14} />
                  <Skeleton width="70%" height={12} />
                </View>
              </Card>
            ))}
          </View>
        ) : isError ? (
          <EmptyState
            icon={Users}
            title={t('owner.staffTitle')}
            body={t('staff.emptySub')}
            cta={{ label: t('common.retry'), onPress: () => void refetch() }}
          />
        ) : staff.length === 0 ? (
          <EmptyState icon={Users} title={t('owner.staffTitle')} body={t('staff.emptySub')} />
        ) : (
          <View style={styles.list}>
            {staff.map((member) => (
              <Card key={member.id} style={styles.row}>
                <Avatar name={member.name} size="md" />
                <View style={styles.rowText}>
                  <Text variant="body" color="textPrimary" numberOfLines={1} style={styles.semibold}>
                    {member.name}
                  </Text>
                  <Text variant="bodySm" color="textSecondary" numberOfLines={1}>
                    {member.email}
                  </Text>
                </View>
                <IconButton
                  icon={UserMinus}
                  accessibilityLabel={t('owner.removeStaff')}
                  color={tones.error.fg}
                  variant="surface"
                  onPress={() => setPendingRemoval(member)}
                />
              </Card>
            ))}
          </View>
        )}
      </Screen>

      <Sheet visible={pendingRemoval !== null} onClose={() => setPendingRemoval(null)}>
        <View style={[styles.sheetIcon, { backgroundColor: tones.error.bg }]}>
          <UserMinus size={26} color={tones.error.fg} />
        </View>
        <Text variant="h3" align="center" style={styles.sheetTitle}>
          {t('owner.removeStaff')}
        </Text>
        <Text variant="bodySm" color="textSecondary" align="center" style={styles.sheetBody}>
          {t('owner.removeStaffBody')}
        </Text>
        <View style={styles.sheetActions}>
          <Button variant="ghost" style={styles.sheetButton} onPress={() => setPendingRemoval(null)}>
            <ButtonText>{t('common.cancel')}</ButtonText>
          </Button>
          <Button
            variant="danger"
            style={styles.sheetButton}
            onPress={onConfirmRemove}
            isLoading={removeStaff.isPending}
            testID="owner-confirm-remove-staff"
          >
            <ButtonText>{t('common.delete')}</ButtonText>
          </Button>
        </View>
      </Sheet>

      <OwnerTabBar active="staff" />
    </View>
  );
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
  promoteCard: {
    gap: spacing.md,
  },
  list: {
    gap: spacing.md,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    padding: 14,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  semibold: {
    fontWeight: '700',
  },
  skeletonRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    padding: 14,
  },
  skeletonText: {
    flex: 1,
    gap: 6,
  },
  sheetIcon: {
    alignItems: 'center',
    alignSelf: 'center',
    borderCurve: 'continuous',
    borderRadius: 18,
    height: 56,
    justifyContent: 'center',
    marginBottom: spacing.md,
    width: 56,
  },
  sheetTitle: {
    marginBottom: 6,
  },
  sheetBody: {
    marginBottom: spacing.lg,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  sheetButton: {
    flex: 1,
  },
});
