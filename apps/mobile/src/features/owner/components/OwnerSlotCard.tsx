import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card, Stepper, Switch, Text } from '@/components/ui';
import { spacing, useTheme } from '@/theme';
import { localizeDigits } from '@/i18n/format';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import type { ManagedSlot } from '@/features/owner/services/ownerSlotsService';

export interface OwnerSlotCardProps {
  slot: ManagedSlot;
  onToggleOpen: (templateId: string, isOpen: boolean) => void;
  onChangeMax: (templateId: string, maxOrders: number) => void;
}

/**
 * Prototype `ownerSlots` per-slot card: window label + open/closed Switch on top;
 * below, a "Max" Stepper and a usage Pill (`{used}/{max}`) that tints error when full.
 */
function OwnerSlotCardComponent({ slot, onToggleOpen, onChangeMax }: OwnerSlotCardProps) {
  const { t } = useTranslation();
  const { tones, tokens } = useTheme();
  const language = useSettingsStore((s) => s.language);

  const isFull = slot.used >= slot.maxOrders;
  const pillStyle = isFull
    ? { backgroundColor: tones.error.bg }
    : { backgroundColor: tokens.tintSoft };
  const pillColor = isFull ? tones.error.fg : tokens.textSecondary;

  const toggle = useCallback(
    (value: boolean) => onToggleOpen(slot.templateId, value),
    [onToggleOpen, slot.templateId],
  );
  const changeMax = useCallback(
    (value: number) => onChangeMax(slot.templateId, value),
    [onChangeMax, slot.templateId],
  );

  return (
    <Card style={styles.card}>
      <View style={styles.topRow}>
        <Text variant="h3" color="textPrimary">{slot.time}</Text>
        <Switch
          value={slot.isOpen}
          onValueChange={toggle}
          accessibilityLabel={slot.time}
        />
      </View>
      <View style={styles.bottomRow}>
        <View style={styles.maxRow}>
          <Text variant="label" color="textSecondary">{t('owner.maxOrders')}</Text>
          <Stepper value={slot.maxOrders} onChange={changeMax} min={1} />
        </View>
        <View style={[styles.pill, pillStyle]}>
          <Text variant="caption" style={{ color: pillColor }} tabular>
            {t('owner.usage', {
              u: localizeDigits(slot.used, language),
              m: localizeDigits(slot.maxOrders, language),
            })}
          </Text>
        </View>
      </View>
    </Card>
  );
}

export const OwnerSlotCard = React.memo(OwnerSlotCardComponent);

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bottomRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  maxRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pill: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: 9999,
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
});
