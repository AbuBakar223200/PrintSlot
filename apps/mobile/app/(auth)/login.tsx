import React, { useState, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { AlertTriangle, Eye, EyeOff, Lock, Mail, Printer } from 'lucide-react-native';
import {
  Banner,
  Button,
  ButtonText,
  FrostCard,
  Input,
  Screen,
  Text,
} from '@/components/ui';
import { spacing, useThemeTokens } from '@/theme';
import { useLogin } from '@/features/auth/hooks/useAuth';

/**
 * Login screen — warm glass-fintech (spec §8.1).
 *
 * Flow:
 * 1. User enters email + password
 * 2. Calls POST /auth/login via useLogin mutation
 * 3. On success → useAuthStore.setSession → root layout redirects by role
 * 4. On error (401) → inline error Banner
 */
export default function LoginScreen() {
  const tokens = useThemeTokens();
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

  const togglePassword = useCallback(() => setShowPassword((prev) => !prev), []);

  const errorMessage = error?.message ?? null;
  const submitDisabled = !email.trim() || !password.trim();

  return (
    <Screen contentContainerStyle={styles.center}>
      <Animated.View entering={FadeIn.duration(220)} style={styles.inner}>
        <View style={styles.brand}>
          <View style={styles.brandMark}>
            <LinearGradient
              colors={tokens.gradientBrand}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Printer size={32} color={tokens.onPrimary} />
          </View>
          <Text variant="h1" color="textPrimary">
            Print
            <Text variant="h1" color="primary">Slot</Text>
          </Text>
          <Text variant="body" color="textSecondary" align="center">
            Skip the queue, print with ease
          </Text>
        </View>

        <FrostCard pad={20}>
          <View style={styles.form}>
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
              leftIcon={<Mail size={18} color={tokens.textMuted} />}
              testID="login-email-input"
            />

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
              leftIcon={<Lock size={18} color={tokens.textMuted} />}
              rightIcon={
                showPassword
                  ? <EyeOff size={18} color={tokens.textMuted} />
                  : <Eye size={18} color={tokens.textMuted} />
              }
              onRightIconPress={togglePassword}
              testID="login-password-input"
            />

            {errorMessage ? (
              <Banner tone="error" icon={AlertTriangle}>{errorMessage}</Banner>
            ) : null}

            <Button
              onPress={handleLogin}
              isLoading={isPending}
              disabled={submitDisabled}
              size="lg"
              testID="login-submit-button"
            >
              <ButtonText>Sign In</ButtonText>
            </Button>

            <View style={styles.footer}>
              <Text variant="bodySm" color="textSecondary">Don't have an account? </Text>
              <Pressable onPress={navigateToRegister} hitSlop={8}>
                <Text variant="bodySm" color="primary" style={styles.bold}>Sign Up</Text>
              </Pressable>
            </View>
          </View>
        </FrostCard>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  inner: {
    gap: spacing.xl,
  },
  brand: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandMark: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderCurve: 'continuous',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  form: {
    gap: spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bold: {
    fontWeight: '700',
  },
});
