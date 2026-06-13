import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Text } from '@/components/ui';
import { spacing, useTheme } from '@/theme';
import { formatMoney } from '@/i18n/format';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import type { PlatformShopRevenue } from '@/features/admin/services/adminAnalyticsService';

export interface RevenueBarsProps {
  data: PlatformShopRevenue[];
}

const BAR_HEIGHT = 10;
const TRACK_WIDTH = 100; // viewBox units; the Svg flexes to fill its row.

/**
 * Prototype `.bars` / `.bar-row`: a per-shop horizontal revenue bar chart. Each
 * row shows the shop name + money on top and a track with an indigo→violet
 * gradient fill (width ∝ revenue / max) below. Ported to `react-native-svg`
 * (same approach as `StatusDonut`).
 */
export function RevenueBars({ data }: RevenueBarsProps) {
  const { tokens } = useTheme();
  const language = useSettingsStore((s) => s.language);
  const max = useMemo(() => Math.max(1, ...data.map((r) => r.revenue)), [data]);

  return (
    <View style={styles.bars}>
      {data.map((row) => {
        const fillWidth = Math.max(2, Math.round((row.revenue / max) * TRACK_WIDTH));
        return (
          <View key={row.shopId} style={styles.row}>
            <View style={styles.labelRow}>
              <Text variant="bodySm" color="textPrimary" numberOfLines={1} style={styles.name}>
                {row.name}
              </Text>
              <Text variant="bodySm" color="textPrimary" tabular>
                {formatMoney(row.revenue, language)}
              </Text>
            </View>
            <Svg width="100%" height={BAR_HEIGHT} viewBox={`0 0 ${TRACK_WIDTH} ${BAR_HEIGHT}`} preserveAspectRatio="none">
              <Defs>
                <LinearGradient id={`bar-${row.shopId}`} x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor={tokens.gradientBrand[0]} />
                  <Stop offset="1" stopColor={tokens.gradientBrand[2]} />
                </LinearGradient>
              </Defs>
              <Rect
                x={0}
                y={0}
                width={TRACK_WIDTH}
                height={BAR_HEIGHT}
                rx={BAR_HEIGHT / 2}
                fill={tokens.tintSoft}
              />
              <Rect
                x={0}
                y={0}
                width={fillWidth}
                height={BAR_HEIGHT}
                rx={BAR_HEIGHT / 2}
                fill={`url(#bar-${row.shopId})`}
              />
            </Svg>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bars: {
    gap: spacing.lg,
  },
  row: {
    gap: 7,
  },
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  name: {
    flex: 1,
  },
});
