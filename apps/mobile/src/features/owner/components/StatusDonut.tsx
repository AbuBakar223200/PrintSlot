import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Text as SvgText } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { OrderStatus } from '@printslot/shared';
import { Text } from '@/components/ui';
import { STATUS_ICONS } from '@/components/ui/icons';
import { spacing, useTheme } from '@/theme';
import { localizeDigits } from '@/i18n/format';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import type { OwnerStatusBreakdown } from '@/features/owner/services/ownerAnalyticsService';

export interface StatusDonutProps {
  byStatus: OwnerStatusBreakdown;
}

/** Render order for the donut + legend (prototype `donut()` tone map order). */
const STATUS_ORDER: readonly OrderStatus[] = [
  OrderStatus.QUEUED,
  OrderStatus.PROCESSING,
  OrderStatus.READY,
  OrderStatus.COLLECTED,
  OrderStatus.CANCELLED,
];

const SIZE = 120;
const RADIUS = 42;
const STROKE = 16;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Prototype `donut()` ported to react-native-svg: a single status-breakdown ring
 * (each segment uses its semantic status tone) with the total in the hub and a
 * tone-swatch legend beside it.
 */
export function StatusDonut({ byStatus }: StatusDonutProps) {
  const { t } = useTranslation();
  const { tokens, tones } = useTheme();
  const language = useSettingsStore((s) => s.language);

  const entries = useMemo(
    () =>
      STATUS_ORDER.map((status) => ({ status, value: byStatus[status] ?? 0 })).filter(
        (e) => e.value > 0,
      ),
    [byStatus],
  );

  const total = entries.reduce((sum, e) => sum + e.value, 0);

  const segments = useMemo(() => {
    let acc = 0;
    return entries.map((entry) => {
      const frac = total > 0 ? entry.value / total : 0;
      const dash = frac * CIRCUMFERENCE;
      const offset = -acc * CIRCUMFERENCE;
      acc += frac;
      return { status: entry.status, dash, offset };
    });
  }, [entries, total]);

  return (
    <View style={styles.wrap}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke={tokens.border}
          strokeWidth={STROKE}
        />
        <G rotation={-90} origin={`${CENTER}, ${CENTER}`}>
          {segments.map((seg) => (
            <Circle
              key={seg.status}
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              stroke={tones[STATUS_ICONS[seg.status].tone].fg}
              strokeWidth={STROKE}
              strokeDasharray={`${seg.dash} ${CIRCUMFERENCE - seg.dash}`}
              strokeDashoffset={seg.offset}
            />
          ))}
        </G>
        <SvgText
          x={CENTER}
          y={CENTER - 2}
          textAnchor="middle"
          fontSize={20}
          fontWeight="800"
          fill={tokens.textPrimary}
        >
          {localizeDigits(total, language)}
        </SvgText>
        <SvgText x={CENTER} y={CENTER + 14} textAnchor="middle" fontSize={9} fill={tokens.textMuted}>
          {t('owner.totalOrders')}
        </SvgText>
      </Svg>

      <View style={styles.legend}>
        {entries.map((entry) => (
          <View key={entry.status} style={styles.legendItem}>
            <View
              style={[styles.swatch, { backgroundColor: tones[STATUS_ICONS[entry.status].tone].fg }]}
            />
            <Text variant="bodySm" color="textSecondary" style={styles.legendLabel}>
              {t(`status.${entry.status}`)}
            </Text>
            <Text variant="bodySm" color="textPrimary" tabular>
              {localizeDigits(entry.value, language)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 18,
  },
  legend: {
    flex: 1,
    gap: 7,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  legendLabel: {
    flex: 1,
  },
  swatch: {
    borderRadius: 3,
    height: 11,
    width: 11,
  },
});
