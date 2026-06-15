import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';

export interface KeyValueProps {
  /** Left label. */
  label: string;
  /** Right value (string/number). Ignored when `children` is provided. */
  value?: string | number;
  /** Total-style row: bold primary key + larger primary value (prototype `.kv` total). */
  emphasis?: boolean;
  /** Drop the hairline divider (last row inside a Card). */
  last?: boolean;
  /** Custom value node (e.g. `MoneyText`, `StatusBadge`) rendered on the right. */
  children?: React.ReactNode;
}

/**
 * F5 — `KeyValue` row. The prototype `.kv` pattern: label left, value right,
 * hairline divider between rows (suppressed on the last). `emphasis` renders the
 * total row — bold key, larger indigo value. Wrap a stack of these in a `Card`.
 */
export function KeyValue({ label, value, emphasis, last, children }: KeyValueProps) {
  const { tokens } = useTheme();

  return (
    <View
      style={[
        styles.row,
        last ? null : { borderBottomWidth: 1, borderBottomColor: tokens.border },
      ]}
    >
      <Text
        variant="body"
        color={emphasis ? 'textPrimary' : 'textSecondary'}
        style={emphasis ? styles.keyEmphasis : undefined}
      >
        {label}
      </Text>
      {children ?? (
        <Text
          variant={emphasis ? 'h3' : 'body'}
          color={emphasis ? 'primary' : 'textPrimary'}
          tabular
          style={emphasis ? undefined : styles.value}
        >
          {String(value ?? '')}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 11,
  },
  keyEmphasis: {
    fontWeight: '700',
  },
  value: {
    fontWeight: '600',
  },
});
