import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Input } from '@/components/ui/Input';
import { Button, ButtonText } from '@/components/ui/Button';
import { useLogin } from '@/features/auth/hooks/useAuth';
import { colors, spacing, borderRadius, typography } from '@/config/theme';

/**
 * Login screen — premium dark design with gradient accents.
 *
 * Flow:
 * 1. User enters email + password
 * 2. Calls POST /auth/login via useLogin mutation
 * 3. On success → useAuthStore.setSession → root layout redirects by role
 * 4. On error → inline error message
 */
export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { mutate: login, isPending, error, reset } = useLogin();

  const handleLogin = useCallback(() => {
    if (!email.trim() || !password.trim()) return;
    reset();
    login({ email: email.trim(), password });
  }, [email, password, login, reset]);

  const navigateToRegister = useCallback(() => {
    router.push('/(auth)/register');
  }, []);

  const errorMessage = error?.message ?? null;

  return (
    <View style={styles.container}>
      {/* Background gradient overlay */}
      <LinearGradient
        colors={['#1A1A2E', '#16213E', '#0F3460']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Decorative gradient orbs */}
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
          showsVerticalScrollIndicator={false}
        >
          {/* Brand Header */}
          <Animated.View
            entering={FadeInUp.duration(800).delay(100)}
            style={styles.header}
          >
            <View style={styles.logoContainer}>
              <Text style={styles.logoIcon}>🖨️</Text>
              <Text style={styles.logoText}>PrintSlot</Text>
            </View>
            <Text style={styles.subtitle}>
              Skip the queue, print with ease
            </Text>
          </Animated.View>

          {/* Login Form Card */}
          <Animated.View
            entering={FadeInDown.duration(800).delay(300)}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>Welcome Back</Text>
            <Text style={styles.cardSubtitle}>
              Sign in to your account
            </Text>

            <View style={styles.form}>
              {/* Email Input */}
              <Input
                label="Email"
                placeholder="you@university.edu"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                returnKeyType="next"
                testID="login-email-input"
              />

              {/* Password Input */}
              <Input
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                testID="login-password-input"
                rightIcon={
                  <Text style={styles.eyeIcon}>
                    {showPassword ? '🙈' : '👁️'}
                  </Text>
                }
                onRightIconPress={() => setShowPassword((prev) => !prev)}
              />

              {/* Error Message */}
              {errorMessage ? (
                <Animated.View
                  entering={FadeInDown.duration(300)}
                  style={styles.errorContainer}
                >
                  <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
                </Animated.View>
              ) : null}

              {/* Login Button */}
              <Button
                onPress={handleLogin}
                isLoading={isPending}
                disabled={!email.trim() || !password.trim()}
                size="lg"
                testID="login-submit-button"
              >
                <ButtonText>Sign In</ButtonText>
              </Button>
            </View>
          </Animated.View>

          {/* Register Link */}
          <Animated.View
            entering={FadeInDown.duration(800).delay(500)}
            style={styles.footer}
          >
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Pressable onPress={navigateToRegister} hitSlop={8}>
              <Text style={styles.footerLink}>Sign Up</Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing['3xl'],
  },

  // Decorative gradient orbs
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

  // Brand Header
  header: {
    alignItems: 'center',
    marginBottom: spacing['3xl'],
    gap: spacing.sm,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  logoIcon: {
    fontSize: 40,
  },
  logoText: {
    ...typography.displayLg,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Card
  card: {
    backgroundColor: colors.glassBg,
    borderRadius: borderRadius.xl,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.sm,
    // Glass effect shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  cardTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  cardSubtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },

  // Form
  form: {
    gap: spacing.lg,
  },
  eyeIcon: {
    fontSize: 18,
  },

  // Error
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

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing['2xl'],
  },
  footerText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  footerLink: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
});
