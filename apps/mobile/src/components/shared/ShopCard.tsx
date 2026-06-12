import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { radii, spacing, useThemeTokens } from '@/theme';
import { Text } from '@/components/ui';

export interface ShopCardProps {
  id: string;
  name: string;
  address: string;
  onPress: (id: string) => void;
}

function ShopCardComponent({ id, name, address, onPress }: ShopCardProps) {
  const tokens = useThemeTokens();

  const handlePress = useCallback(() => {
    onPress(id);
  }, [id, onPress]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${name}`}
      android_ripple={{ color: tokens.border }}
      onPress={handlePress}
      testID={`shop-card-${id}`}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: tokens.surface, borderColor: tokens.border },
        pressed ? styles.pressed : null,
      ]}
    >
      <View
        style={[
          styles.initialBadge,
          { backgroundColor: tokens.tintSoft, borderColor: tokens.border },
        ]}
      >
        <Text variant="h3" color="primary">
          {name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.content}>
        <Text variant="h3" color="textPrimary" numberOfLines={1}>
          {name}
        </Text>
        <Text variant="bodySm" color="textSecondary" numberOfLines={2}>
          {address}
        </Text>
      </View>
    </Pressable>
  );
}

export const ShopCard = memo(ShopCardComponent);

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: radii.card,
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
    borderCurve: 'continuous',
    borderRadius: radii.control,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
});
