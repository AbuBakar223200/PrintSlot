import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ClipboardList } from 'lucide-react-native';
import { Avatar, EmptyState, Screen, Text } from '@/components/ui';
import { spacing } from '@/theme';

/**
 * Staff Jobs landing (spec §8.12 shell). The full job dashboard lands with
 * Slice 20; this is the reskinned shell — header + Avatar→Profile + an empty
 * placeholder for the job queue.
 */
export default function StaffJobsScreen() {
  const openProfile = useCallback(() => {
    router.push('/(staff)/profile' as never);
  }, []);

  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.grow}>
          <Text variant="h1" color="textPrimary">Jobs</Text>
          <Text variant="bodySm" color="textSecondary">Today's print queue</Text>
        </View>
        <Pressable
          onPress={openProfile}
          accessibilityRole="button"
          accessibilityLabel="Profile"
          hitSlop={8}
          testID="staff-profile-button"
        >
          <Avatar name="Staff" size="md" />
        </Pressable>
      </View>

      <EmptyState
        icon={ClipboardList}
        title="No jobs yet"
        body="Print jobs assigned to your shop will appear here."
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
