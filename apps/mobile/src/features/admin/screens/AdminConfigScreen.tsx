import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Settings } from 'lucide-react-native';
import {
  Avatar,
  Card,
  EmptyState,
  Screen,
  Skeleton,
  Text,
  toast,
} from '@/components/ui';
import { AdminTabBar, ADMIN_TAB_BAR_HEIGHT } from '@/components/shared/AdminTabBar';
import { spacing, useThemeTokens } from '@/theme';
import { localizeDigits } from '@/i18n/format';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { EditConfigSheet } from '@/features/admin/components/EditConfigSheet';
import { useAdminConfig, useUpdateConfig } from '@/features/admin/hooks/useAdminConfig';
import type { AppConfigRow } from '@/features/admin/services/adminConfigService';

const SKELETON_ROWS = ['c1', 'c2'];

export default function AdminConfigScreen() {
  const { t } = useTranslation();
  const tokens = useThemeTokens();
  const language = useSettingsStore((s) => s.language);
  const adminName = useAuthStore((s) => s.user?.name ?? 'Platform Admin');
  const { data, isLoading, isError, refetch } = useAdminConfig();
  const updateConfig = useUpdateConfig();

  const [editing, setEditing] = useState<AppConfigRow | null>(null);

  const openProfile = useCallback(() => {
    router.push('/(admin)/profile' as never);
  }, []);

  const onSave = useCallback(
    (value: string) => {
      if (!editing) return;
      updateConfig.mutate(
        { key: editing.key, value },
        {
          onSuccess: () => {
            setEditing(null);
            toast(t('toast.configUpdated'), { tone: 'success' });
          },
        },
      );
    },
    [editing, t, updateConfig],
  );

  const header = (
    <View style={styles.header}>
      <View style={styles.grow}>
        <Text variant="h1" color="textPrimary">{t('admin.configTitle')}</Text>
      </View>
      <Pressable
        accessibilityLabel={t('tab.profile')}
        accessibilityRole="button"
        hitSlop={8}
        onPress={openProfile}
        testID="admin-config-profile-button"
      >
        <Avatar name={adminName} size="md" />
      </Pressable>
    </View>
  );

  return (
    <View style={styles.root}>
      <Screen contentContainerStyle={styles.content}>
        {header}

        {isLoading ? (
          <View style={styles.list}>
            {SKELETON_ROWS.map((id) => (
              <Card key={id} style={styles.skeletonCard}>
                <Skeleton width="50%" height={16} />
                <Skeleton width="80%" height={12} />
              </Card>
            ))}
          </View>
        ) : isError || !data ? (
          <EmptyState
            icon={Settings}
            title={t('admin.configTitle')}
            body={t('notif.emptySub')}
            cta={{ label: t('common.retry'), onPress: () => void refetch() }}
          />
        ) : (
          <View style={styles.list}>
            {data.map((row) => (
              <Pressable
                key={row.key}
                accessibilityRole="button"
                accessibilityLabel={row.key}
                onPress={() => setEditing(row)}
                style={({ pressed }) => [pressed ? styles.pressed : null]}
                testID={`config-row-${row.key}`}
              >
                <Card style={styles.row}>
                  <View style={styles.grow}>
                    <Text variant="label" color="textPrimary">{row.key}</Text>
                    <Text variant="caption" color="textMuted" style={styles.desc}>
                      {t(row.descKey)}
                    </Text>
                  </View>
                  <Text variant="h3" color="primary" tabular>
                    {localizeDigits(row.value, language)}
                  </Text>
                  <ChevronRight size={18} color={tokens.textMuted} />
                </Card>
              </Pressable>
            ))}
          </View>
        )}
      </Screen>
      <AdminTabBar active="config" />
      <EditConfigSheet
        config={editing}
        onClose={() => setEditing(null)}
        onSave={onSave}
        isSaving={updateConfig.isPending}
      />
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
    paddingBottom: ADMIN_TAB_BAR_HEIGHT + spacing.lg,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  grow: {
    flex: 1,
  },
  list: {
    gap: spacing.md,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  desc: {
    marginTop: 2,
  },
  skeletonCard: {
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.85,
  },
});
