import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';
import type { LucideIcon } from './icons';

export interface StatCardProps {
  icon: LucideIcon;
  /** Caption under the value. */
  label: string;
  /** Pre-formatted value (money/count already localized). */
  value: string;
  /**
   * Position in the stat grid → governed pastel rotation
   * (lavender → mint → peach → sky). Pass the map index.
   */
  index?: number;
}

/**
 * F5 — `StatCard` (prototype `.stat-card` + soft-pastel grouping set, spec §3).
 * Analytics grids rotate the four governed pastels by `index`. Pastels are a
 * grouping device only — never used for status (Section 4 owns status color).
 */
export function StatCard({ icon: Icon, label, value, index = 0 }: StatCardProps) {
  const { pastels, radii, tokens } = useTheme();
  const order = ['lavender', 'mint', 'peach', 'sky'] as const;
  const pastel = pastels[order[index % order.length]];

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: pastel.bg, borderRadius: radii.card },
      ]}
    >
      <View
        style={[
          styles.iconTile,
          { backgroundColor: tokens.surfaceFrost, borderRadius: radii.sm },
        ]}
      >
        <Icon size={17} color={pastel.fg} />
      </View>
      <Text variant="h2" color="textPrimary" tabular>{value}</Text>
      <Text variant="bodySm" color="textSecondary">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderCurve: 'continuous',
    flex: 1,
    gap: 2,
    overflow: 'hidden',
    padding: 15,
  },
  iconTile: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    marginBottom: 8,
    width: 32,
  },
});
