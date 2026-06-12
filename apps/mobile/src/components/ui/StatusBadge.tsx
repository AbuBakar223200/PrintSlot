import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { OrderStatus } from '@printslot/shared';
import { useTheme } from '@/theme';
import { Text } from './Text';
import { STATUS_ICONS } from './icons';

export interface StatusBadgeProps {
  status: OrderStatus;
}

/**
 * F5 — `StatusBadge` primitive.
 *
 * Renders an OrderStatus with its fixed tone + lucide icon (§4.1) and a localized
 * label, identically on customer and staff screens. The color crossfade on status
 * change is handled by the consumer re-rendering with a new status.
 */
export function StatusBadge({ status }: StatusBadgeProps) {
  const { tones } = useTheme();
  const { t } = useTranslation();
  const meta = STATUS_ICONS[status];
  const tone = tones[meta.tone];
  const Glyph = meta.icon;
  const label = t(meta.labelKey);

  return (
    <View
      style={[styles.badge, { backgroundColor: tone.bg }]}
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      <Glyph size={13} color={tone.fg} />
      <Text variant="label" style={{ color: tone.fg }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    borderCurve: 'continuous',
  },
});
