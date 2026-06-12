import React from 'react';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import { formatMoney } from '@/i18n/format';
import { Text, type TextProps } from './Text';

export interface MoneyTextProps extends Omit<TextProps, 'children' | 'tabular'> {
  amount: number;
  /** Ledger sign prefix. */
  sign?: '+' | '-';
  /** Force decimal places; default auto (0 for ints, 2 otherwise). */
  decimals?: 0 | 2;
}

/**
 * F5 — `MoneyText` primitive. ৳ + tabular figures, Bengali numerals in BN mode
 * (Fork 11). Always tabular so values stay column-aligned as digits change.
 */
export function MoneyText({ amount, sign, decimals, ...rest }: MoneyTextProps) {
  const language = useSettingsStore((s) => s.language);
  const body = formatMoney(amount, language, decimals);
  return (
    <Text tabular {...rest}>
      {sign ?? ''}
      {body}
    </Text>
  );
}
