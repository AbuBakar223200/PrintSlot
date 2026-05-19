import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { borderRadius, colors, spacing, typography } from '@/config/theme';

export interface ShopCardProps {
  id: string;
  name: string;
  address: string;
  onPress: (id: string) => void;
}

function ShopCardComponent({ id, name, address, onPress }: ShopCardProps) {
  const handlePress = useCallback(() => {
    onPress(id);
  }, [id, onPress]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${name}`}
      android_ripple={{ color: colors.borderLight }}
      onPress={handlePress}
      testID={`shop-card-${id}`}
      style={({ pressed }) => [
        styles.card,
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={styles.initialBadge}>
        <Text style={styles.initial}>{name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.content}>
        <Text numberOfLines={1} style={styles.name}>{name}</Text>
        <Text numberOfLines={2} style={styles.address}>{address}</Text>
      </View>
    </Pressable>
  );
}

export const ShopCard = memo(ShopCardComponent);

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderCurve: 'continuous',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 88,
    padding: spacing.lg,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  initialBadge: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderLight,
    borderCurve: 'continuous',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  initial: {
    ...typography.h3,
    color: colors.primary,
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  address: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
});
