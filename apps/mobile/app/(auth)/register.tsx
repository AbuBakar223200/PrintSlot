import React, { useState, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { AlertTriangle, Eye, EyeOff, Lock, Mail, Phone, Printer, User } from 'lucide-react-native';
import { Role, validateRegisterInput } from '@printslot/shared';
import {
  Banner,
  Button,
  ButtonText,
  FrostCard,
  Input,
  Screen,
  SegmentedControl,
  Text,
} from '@/components/ui';
import { spacing, useThemeTokens } from '@/theme';
import { useRegister } from '@/features/auth/hooks/useAuth';

type RegisterRole = Role.CUSTOMER | Role.SHOP_OWNER;

const ROLE_OPTIONS: ReadonlyArray<{ value: RegisterRole; label: string }> = [
  { value: Role.CUSTOMER, label: 'Customer' },
  { value: Role.SHOP_OWNER, label: 'Shop Owner' },
];

/**
 * Register screen — warm glass-fintech (spec §8.2).
 *
 * Role picker is Customer / Shop Owner only (Staff accounts are created by owner
 * promotion, not self-registration — CONTEXT.md). Client-side validation →
 * POST /auth/register via useRegister → root layout redirects by role.
 */
export default function RegisterScreen() {
  const tokens = useThemeTokens();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RegisterRole>(Role.CUSTOMER);

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const { mutate: register, isPending, error, reset } = useRegister();

  const clearFieldError = useCallback((field: string) => {
    setValidationErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const validate = useCallback((): boolean => {
    const validation = validateRegisterInput({
      name,
      email,
      password,
      phone: phone.trim() || undefined,
      role: selectedRole,
    });
    const errors: Record<string, string> = { ...validation.errors };

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [name, email, phone, password, confirmPassword, selectedRole]);

  const handleRegister = useCallback(() => {
    if (!validate()) return;
    reset();

    register({
      name: name.trim(),
      email: email.trim(),
      password,
      phone: phone.trim() || undefined,
      role: selectedRole,
    });
  }, [name, email, phone, password, selectedRole, validate, register, reset]);

  const navigateToLogin = useCallback(() => {
    router.back();
  }, []);

  const togglePassword = useCallback(() => setShowPassword((prev) => !prev), []);

  const serverError = error?.message ?? null;

  return (
    <Screen contentContainerStyle={styles.content}>
      <Animated.View entering={FadeIn.duration(220)} style={styles.inner}>
        <View style={styles.brand}>
          <View style={styles.brandMark}>
            <LinearGradient
              colors={tokens.gradientBrand}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Printer size={28} color={tokens.onPrimary} />
          </View>
          <Text variant="h2" color="textPrimary">Create account</Text>
          <Text variant="bodySm" color="textSecondary" align="center">
            Create your account to get started
          </Text>
        </View>

        <FrostCard pad={20}>
          <View style={styles.form}>
            <View style={styles.field}>
              <Text variant="label" color="textSecondary" style={styles.label}>I am a</Text>
              <SegmentedControl
                options={ROLE_OPTIONS}
                value={selectedRole}
                onChange={setSelectedRole}
              />
            </View>

            <Input
              label="Full Name"
              placeholder="Enter your full name"
              value={name}
              onChangeText={(text) => { setName(text); clearFieldError('name'); }}
              autoCapitalize="words"
              autoComplete="name"
              returnKeyType="next"
              error={validationErrors.name}
              leftIcon={<User size={18} color={tokens.textMuted} />}
              testID="register-name-input"
            />

            <Input
              label="Email"
              placeholder="you@university.edu"
              value={email}
              onChangeText={(text) => { setEmail(text); clearFieldError('email'); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              returnKeyType="next"
              error={validationErrors.email}
              leftIcon={<Mail size={18} color={tokens.textMuted} />}
              testID="register-email-input"
            />

            <Input
              label="Phone (Optional)"
              placeholder="+880 1XXX-XXXXXX"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
              returnKeyType="next"
              leftIcon={<Phone size={18} color={tokens.textMuted} />}
              testID="register-phone-input"
            />

            <Input
              label="Password"
              placeholder="At least 6 characters"
              value={password}
              onChangeText={(text) => { setPassword(text); clearFieldError('password'); }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="new-password"
              returnKeyType="next"
              error={validationErrors.password}
              leftIcon={<Lock size={18} color={tokens.textMuted} />}
              rightIcon={
                showPassword
                  ? <EyeOff size={18} color={tokens.textMuted} />
                  : <Eye size={18} color={tokens.textMuted} />
              }
              onRightIconPress={togglePassword}
              testID="register-password-input"
            />

            <Input
              label="Confirm Password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChangeText={(text) => { setConfirmPassword(text); clearFieldError('confirmPassword'); }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleRegister}
              error={validationErrors.confirmPassword}
              leftIcon={<Lock size={18} color={tokens.textMuted} />}
              testID="register-confirm-password-input"
            />

            {serverError ? (
              <Banner tone="error" icon={AlertTriangle}>{serverError}</Banner>
            ) : null}

            <Button
              onPress={handleRegister}
              isLoading={isPending}
              size="lg"
              testID="register-submit-button"
            >
              <ButtonText>Create Account</ButtonText>
            </Button>

            <View style={styles.footer}>
              <Text variant="bodySm" color="textSecondary">Already have an account? </Text>
              <Pressable onPress={navigateToLogin} hitSlop={8}>
                <Text variant="bodySm" color="primary" style={styles.bold}>Sign In</Text>
              </Pressable>
            </View>
          </View>
        </FrostCard>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  inner: {
    gap: spacing.xl,
  },
  brand: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandMark: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderCurve: 'continuous',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  form: {
    gap: spacing.md,
  },
  field: {
    gap: 6,
  },
  label: {
    marginLeft: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  bold: {
    fontWeight: '700',
  },
});
