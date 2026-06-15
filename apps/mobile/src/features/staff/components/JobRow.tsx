import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Avatar, Card, StatusBadge, Text } from '@/components/ui';
import { spacing, useThemeTokens } from '@/theme';
import { formatRelative } from '@/i18n/format';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import type { StaffJob } from '@/features/staff/services/staffJobService';

export interface JobRowProps {
  job: StaffJob;
  onPress: (orderId: string) => void;
}

/** "Rimon Hasan" → { first: "Rimon", lastInitial: "H" }. */
function splitName(name?: string | null) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? '';
  const lastInitial = parts[1]?.[0] ?? '';
  return { first, lastInitial };
}

/**
 * Prototype `jobRow` (`.order-card`): orderNumber + StatusBadge on top; below, a
 * small Avatar initial + "First L." + file count + the slot window or relative
 * time. Tapping opens the job detail.
 */
function JobRowComponent({ job, onPress }: JobRowProps) {
  const tokens = useThemeTokens();
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);

  const { first, lastInitial } = splitName(job.customerName);
  const customerLabel = lastInitial ? `${first} ${lastInitial}.` : first;
  const fileCount = job.orderFiles?.length ?? 0;
  const fileLabel = fileCount === 1
    ? t('common.file', { n: fileCount })
    : t('common.files', { n: fileCount });
  const time = job.slotTime ? job.slotTime : formatRelative(job.createdAt, language);

  const press = useCallback(() => onPress(job.id), [onPress, job.id]);

  return (
    <Pressable
      accessibilityLabel={`Order ${job.orderNumber}`}
      accessibilityRole="button"
      onPress={press}
      style={({ pressed }) => [pressed ? styles.pressed : null]}
    >
      <Card style={styles.card}>
        <View style={styles.topRow}>
          <Text variant="h3" color="textPrimary" numberOfLines={1} style={styles.orderNumber}>
            {job.orderNumber}
          </Text>
          <StatusBadge status={job.status} />
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.meta}>
            {customerLabel ? (
              <Avatar initials={lastInitial || first.charAt(0)} size="sm" rounded style={styles.avatar} />
            ) : null}
            {customerLabel ? (
              <Text variant="bodySm" color="textSecondary" numberOfLines={1}>
                {customerLabel}
              </Text>
            ) : null}
            {customerLabel ? <View style={[styles.sep, { backgroundColor: tokens.textMuted }]} /> : null}
            <Text variant="bodySm" color="textSecondary" numberOfLines={1}>
              {fileLabel}
            </Text>
          </View>
          <Text variant="bodySm" color="textMuted" numberOfLines={1}>
            {time}
          </Text>
        </View>
      </Card>
    </Pressable>
  );
}

export const JobRow = memo(JobRowComponent);

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: 14,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  orderNumber: {
    flex: 1,
  },
  bottomRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  meta: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  avatar: {
    height: 26,
    width: 26,
  },
  sep: {
    borderRadius: 9999,
    height: 3,
    width: 3,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
});
