import React, { useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { Button, ButtonText } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/config/theme';

export default function AdminShops() {
  const openProfile = useCallback(() => {
    router.push('/(admin)/profile' as never);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Admin Shops Dashboard</Text>
        <Text style={styles.subtitle}>Welcome, Platform Admin!</Text>
        <Button onPress={openProfile} size="lg" testID="admin-profile-button">
          <ButtonText>Profile</ButtonText>
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
