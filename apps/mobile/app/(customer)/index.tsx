import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Store } from 'lucide-react-native';
import {
  Avatar,
  Button,
  ButtonIcon,
  ButtonText,
  Screen,
  Text,
} from '@/components/ui';
import { spacing, useThemeTokens } from '@/theme';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

/**
 * Customer home landing (spec §8.3 shell). The full Home hub — search, active
 * orders, recent activity — lands with Slice 32. For now this is a reskinned
 * landing: time-agnostic greeting + Avatar→Profile + a Browse Shops CTA.
 */
export default function CustomerHomeScreen() {
  const tokens = useThemeTokens();
  const user = useAuthStore((s) => s.user);
  const firstName = user?.name?.trim().split(/\s+/)[0] || 'there';

  const openShops = useCallback(() => {
    router.push('/(customer)/shops' as never);
  }, []);

  const openProfile = useCallback(() => {
    router.push('/(customer)/profile' as never);
  }, []);

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.grow}>
          <Text variant="bodySm" color="textSecondary">Hello,</Text>
          <Text variant="h1" color="textPrimary">{firstName}</Text>
        </View>
        <Pressable
          onPress={openProfile}
          accessibilityRole="button"
          accessibilityLabel="Profile"
          hitSlop={8}
        >
          <Avatar name={user?.name} size="md" />
        </Pressable>
      </View>

      <Text variant="body" color="textSecondary">
        Find a print shop and skip the queue.
      </Text>

      <View style={styles.actions}>
        <Button onPress={openShops} size="lg" testID="customer-shops-button">
          <ButtonIcon><Store size={18} color={tokens.onPrimary} /></ButtonIcon>
          <ButtonText>Browse Shops</ButtonText>
        </Button>
        <Button onPress={openProfile} variant="secondary" size="lg" testID="customer-profile-button">
          <ButtonText>Profile</ButtonText>
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  grow: {
    flex: 1,
    gap: 2,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});
