import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Input } from '@/components/ui/Input';
import { Button, ButtonText } from '@/components/ui/Button';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { colors, spacing, borderRadius, typography } from '@/config/theme';
import { useUpdateProfile } from '../hooks/useProfile';
import { useLogout } from '../hooks/useLogout';
import { UpdateProfileSchema } from '../dto/updateProfile.dto';

/**
 * Shared profile screen — mounted at /(customer)/profile, /(owner)/profile,
 * /(staff)/profile, /(admin)/profile. Identical behavior across roles.
 *
 * Fields: name, phone. (Language deferred to Slice 33 when i18n ships.)
 * Save fires PATCH /users/me via useUpdateProfile.
 * Logout fires best-effort device unregistration then clearSession.
 */
export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const { mutate: updateProfile, isPending, error, reset } = useUpdateProfile();
  const logout = useLogout();

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [fieldError, setFieldError] = useState<string | null>(null);

  const isDirty = useMemo(() => {
    if (!user) return false;
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const currentPhone = user.phone ?? '';
    return trimmedName !== user.name || trimmedPhone !== currentPhone;
  }, [name, phone, user]);

  const handleSave = useCallback(() => {
    reset();
    setFieldError(null);
    const parsed = UpdateProfileSchema.safeParse({ name, phone });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? 'Invalid input');
      return;
    }
    updateProfile(parsed.data);
  }, [name, phone, updateProfile, reset]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Log out?',
      'You will need to sign in again to access your account.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: () => {
            logout().catch((err) => console.warn('[logout]', err));
          },
        },
      ],
    );
  }, [logout]);

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  const errorMessage = fieldError ?? error?.message ?? null;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1A1A2E', '#16213E', '#0F3460']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={styles.orbTopRight} />
      <View style={styles.orbBottomLeft} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInUp.duration(600)} style={styles.header}>
            <Text style={styles.title}>Profile</Text>
            <Text style={styles.subtitle}>{user.email}</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(600).delay(150)} style={styles.card}>
            <View style={styles.form}>
              <Input
                label="Name"
                placeholder="Your full name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoComplete="name"
                returnKeyType="next"
                testID="profile-name-input"
              />

              <Input
                label="Phone"
                placeholder="Optional"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoComplete="tel"
                returnKeyType="done"
                testID="profile-phone-input"
              />

              {errorMessage ? (
                <Animated.View entering={FadeInDown.duration(200)} style={styles.errorContainer}>
                  <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
                </Animated.View>
              ) : null}

              <Button
                onPress={handleSave}
                isLoading={isPending}
                disabled={!isDirty || isPending}
                size="lg"
                testID="profile-save-button"
              >
                <ButtonText>Save changes</ButtonText>
              </Button>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(600).delay(300)} style={styles.logoutSection}>
            <Button
              onPress={handleLogout}
              variant="ghost"
              size="md"
              testID="profile-logout-button"
            >
              <ButtonText>Log out</ButtonText>
            </Button>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing['3xl'],
  },
  orbTopRight: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
  },
  orbBottomLeft: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 107, 53, 0.08)',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
    gap: spacing.xs,
  },
  title: {
    ...typography.displayLg,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.glassBg,
    borderRadius: borderRadius.xl,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  form: { gap: spacing.lg },
  errorContainer: {
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderRadius: borderRadius.sm,
    borderCurve: 'continuous',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  errorText: {
    ...typography.bodySm,
    color: colors.error,
    textAlign: 'center',
  },
  logoutSection: {
    marginTop: spacing['2xl'],
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing['3xl'],
  },
});
