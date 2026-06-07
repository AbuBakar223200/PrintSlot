import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Button, ButtonText } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/config/theme';

export default function CustomerHomeScreen() {
  const openShops = useCallback(() => {
    router.push('/(customer)/shops' as never);
  }, []);

  const openProfile = useCallback(() => {
    router.push('/(customer)/profile' as never);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Customer Home</Text>
        <Text style={styles.subtitle}>Find a print shop or manage your profile.</Text>
        <Button onPress={openShops} size="lg" testID="customer-shops-button">
          <ButtonText>Browse Shops</ButtonText>
        </Button>
        <Button onPress={openProfile} variant="secondary" size="lg" testID="customer-profile-button">
          <ButtonText>Profile</ButtonText>
        </Button>
      </View>
    </View>
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
