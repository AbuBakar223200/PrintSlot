import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CalendarClock, Clock, Pencil, Plus, Trash2 } from 'lucide-react-native';
import {
  Avatar,
  Button,
  ButtonText,
  Card,
  EmptyState,
  IconButton,
  Screen,
  Sheet,
  Skeleton,
  Text,
  toast,
} from '@/components/ui';
import { AdminTabBar, ADMIN_TAB_BAR_HEIGHT } from '@/components/shared/AdminTabBar';
import { spacing, useThemeTokens } from '@/theme';
import { localizeDigits } from '@/i18n/format';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import {
  TemplateFormSheet,
  type TemplateFormMode,
  type TemplateFormValues,
} from '@/features/admin/components/TemplateFormSheet';
import {
  useAdminTemplates,
  useCreateTemplate,
  useDeleteTemplate,
  useUpdateTemplate,
} from '@/features/admin/hooks/useAdminTemplates';
import type { AdminTemplate } from '@/features/admin/services/adminTemplatesService';

const SKELETON_ROWS = ['t1', 't2', 't3'];

/**
 * Prototype `SCREENS.adminTemplates`: slot-template rows (clock + time window) with
 * add / edit / soft-delete. Add+edit use `TemplateFormSheet`; delete opens a
 * confirm sheet (soft delete — existing slots stay valid).
 */
export default function AdminTemplatesScreen() {
  const { t } = useTranslation();
  const tokens = useThemeTokens();
  const language = useSettingsStore((s) => s.language);
  const adminName = useAuthStore((s) => s.user?.name ?? 'Platform Admin');

  const { data, isLoading, isError, refetch } = useAdminTemplates();
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();

  const [form, setForm] = useState<{ mode: TemplateFormMode; template: AdminTemplate | null } | null>(null);
  const [deleting, setDeleting] = useState<AdminTemplate | null>(null);

  const openProfile = useCallback(() => {
    router.push('/(admin)/profile' as never);
  }, []);

  const openAdd = useCallback(() => setForm({ mode: 'add', template: null }), []);
  const openEdit = useCallback((template: AdminTemplate) => setForm({ mode: 'edit', template }), []);
  const closeForm = useCallback(() => setForm(null), []);

  const onSubmit = useCallback(
    (values: TemplateFormValues) => {
      if (form?.mode === 'edit' && form.template) {
        updateTemplate.mutate(
          { id: form.template.id, ...values },
          {
            onSuccess: () => {
              setForm(null);
              toast(t('toast.saved'), { tone: 'success' });
            },
          },
        );
      } else {
        createTemplate.mutate(values, {
          onSuccess: () => {
            setForm(null);
            toast(t('toast.templateAdded'), { tone: 'success' });
          },
        });
      }
    },
    [createTemplate, form, t, updateTemplate],
  );

  const confirmDelete = useCallback(() => {
    if (!deleting) return;
    deleteTemplate.mutate(deleting.id, {
      onSuccess: () => {
        setDeleting(null);
        toast(t('toast.templateDeleted'), { tone: 'success' });
      },
    });
  }, [deleteTemplate, deleting, t]);

  const header = (
    <View style={styles.header}>
      <View style={styles.grow}>
        <Text variant="h1" color="textPrimary">{t('admin.templatesTitle')}</Text>
      </View>
      <IconButton
        icon={Plus}
        accessibilityLabel={t('admin.addTemplate')}
        onPress={openAdd}
        variant="surface"
      />
      <Pressable
        accessibilityLabel={t('tab.profile')}
        accessibilityRole="button"
        hitSlop={8}
        onPress={openProfile}
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
              <Card key={id} style={styles.skeletonRow}>
                <Skeleton width={40} height={40} radius={10} />
                <Skeleton width="45%" height={14} />
              </Card>
            ))}
          </View>
        ) : isError || !data ? (
          <EmptyState
            icon={CalendarClock}
            title={t('admin.templatesTitle')}
            body={t('notif.emptySub')}
            cta={{ label: t('common.retry'), onPress: () => void refetch() }}
          />
        ) : data.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title={t('admin.templatesTitle')}
            body={t('notif.emptySub')}
            cta={{ label: t('admin.addTemplate'), onPress: openAdd }}
          />
        ) : (
          <View style={styles.list}>
            {data.map((template) => (
              <Card key={template.id} style={styles.row}>
                <View style={[styles.leadIcon, { backgroundColor: tokens.tintSoft }]}>
                  <Clock size={20} color={tokens.primary} />
                </View>
                <Text variant="body" color="textPrimary" tabular style={styles.grow}>
                  {localizeDigits(template.time, language)}
                </Text>
                <IconButton
                  icon={Pencil}
                  accessibilityLabel={t('common.edit')}
                  onPress={() => openEdit(template)}
                  variant="surface"
                />
                <IconButton
                  icon={Trash2}
                  accessibilityLabel={t('common.delete')}
                  onPress={() => setDeleting(template)}
                  variant="surface"
                />
              </Card>
            ))}
          </View>
        )}
      </Screen>

      <AdminTabBar active="templates" />

      <TemplateFormSheet
        visible={form !== null}
        mode={form?.mode ?? 'add'}
        template={form?.template}
        onClose={closeForm}
        onSubmit={onSubmit}
        isSubmitting={createTemplate.isPending || updateTemplate.isPending}
      />

      <Sheet visible={deleting !== null} onClose={() => setDeleting(null)}>
        <Text variant="h3" color="textPrimary" style={styles.sheetTitle}>
          {t('admin.deleteTemplate')}
        </Text>
        <Text variant="body" color="textSecondary" style={styles.sheetBody}>
          {t('admin.deleteTemplateBody')}
        </Text>
        <View style={styles.sheetActions}>
          <View style={styles.grow}>
            <Button variant="ghost" onPress={() => setDeleting(null)}>
              <ButtonText>{t('common.cancel')}</ButtonText>
            </Button>
          </View>
          <View style={styles.grow}>
            <Button variant="danger" isLoading={deleteTemplate.isPending} onPress={confirmDelete}>
              <ButtonText>{t('common.delete')}</ButtonText>
            </Button>
          </View>
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    padding: spacing.xl,
    paddingBottom: ADMIN_TAB_BAR_HEIGHT + spacing.xl,
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
  leadIcon: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: 10,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  skeletonRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  sheetTitle: {
    marginBottom: spacing.sm,
  },
  sheetBody: {
    marginBottom: spacing.lg,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
