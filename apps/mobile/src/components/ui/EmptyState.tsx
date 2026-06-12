import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useThemeTokens } from '@/theme';
import { Text } from './Text';
import { Button, ButtonText } from './Button';
import type { LucideIcon } from './icons';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  body?: string;
  cta?: { label: string; onPress: () => void };
}

/**
 * F5 — `EmptyState` primitive (spec §7). A tinted-circle lucide icon + title +
 * one-line body + optional CTA. Used for every empty/zeros list.
 */
export function EmptyState({ icon: Icon, title, body, cta }: EmptyStateProps) {
  const tokens = useThemeTokens();

  return (
    <View style={styles.wrap}>
      <View style={[styles.circle, { backgroundColor: tokens.tintSoft }]}>
        <Icon size={30} color={tokens.primary} />
      </View>
      <Text variant="h3" align="center">
        {title}
      </Text>
      {body ? (
        <Text variant="bodySm" color="textSecondary" align="center" style={styles.body}>
          {body}
        </Text>
      ) : null}
      {cta ? (
        <Button onPress={cta.onPress} style={styles.cta}>
          <ButtonText>{cta.label}</ButtonText>
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8, paddingVertical: 40, paddingHorizontal: 20 },
  circle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  body: { maxWidth: 260 },
  cta: { marginTop: 12, alignSelf: 'center' },
});
