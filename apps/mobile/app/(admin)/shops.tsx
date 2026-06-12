import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Store } from 'lucide-react-native';
import { Avatar, EmptyState, Screen, Text } from '@/components/ui';
import { spacing } from '@/theme';

/**
 * Admin Shops landing (spec §8.21 shell). The full shop-approval queue lands with
 * Slice 28; this is the reskinned shell — header + Avatar→Profile + an empty
 * placeholder for the approvals list.
 */
export default function AdminShops() {
  const openProfile = useCallback(() => {
    router.push('/(admin)/profile' as never);
  }, []);

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.grow}>
          <Text variant="h1" color="textPrimary">Shops</Text>
          <Text variant="bodySm" color="textSecondary">Platform Admin</Text>
        </View>
        <Pressable
          onPress={openProfile}
          accessibilityRole="button"
          accessibilityLabel="Profile"
          hitSlop={8}
          testID="admin-profile-button"
        >
          <Avatar name="Platform Admin" size="md" />
        </Pressable>
      </View>

      <EmptyState
        icon={Store}
        title="Shop approvals"
        body="Pending shops awaiting review will appear here."
      />
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
});
