import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MapPin } from 'lucide-react-native';
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
        <View style={styles.titleRow}>
          <Text variant="h3" color="textPrimary" numberOfLines={1} style={styles.title}>
            {name}
          </Text>
          <View style={[styles.activeDot, { backgroundColor: tokens.success }]} />
        </View>
        <View style={styles.addressRow}>
          <MapPin size={14} color={tokens.textMuted} />
          <Text variant="bodySm" color="textSecondary" numberOfLines={2} style={styles.title}>
            {address}
          </Text>
        </View>
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
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
  },
  activeDot: {
    borderRadius: radii.full,
    height: 8,
    width: 8,
  },
  addressRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
});
