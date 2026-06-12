import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useThemeTokens } from '@/theme';
import { Text } from './Text';

export interface ListRowProps {
  label: string;
  /** Right-aligned value text (use `right` for custom content instead). */
  value?: string;
  right?: React.ReactNode;
  /** Bottom hairline divider (default true). */
  divider?: boolean;
  style?: ViewStyle;
}

/**
 * F5 — `ListRow` primitive. Generic label/value row for config and detail tables.
 */
export function ListRow({ label, value, right, divider = true, style }: ListRowProps) {
  const tokens = useThemeTokens();

  return (
    <View
      style={[
        styles.row,
        divider ? { borderBottomWidth: 1, borderBottomColor: tokens.border } : null,
        style,
      ]}
    >
      <Text variant="bodySm" color="textSecondary">
        {label}
      </Text>
      {right ? right : value ? <Text variant="bodySm" tabular>{value}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    gap: 12,
  },
});
