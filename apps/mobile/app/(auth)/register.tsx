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
import { useRegister } from '@/features/auth/hooks/useAuth';
import { Role, validateRegisterInput } from '@printslot/shared';
import { colors, spacing, borderRadius, typography } from '@/config/theme';

/**
 * Register screen — premium dark design matching login.
 *
 * Flow:
 * 1. User enters name, email, phone (optional), password, confirm password
 * 2. Selects role: CUSTOMER (default), STAFF, or SHOP_OWNER
 * 3. Client-side validation → POST /auth/register via useRegister
 * 4. On success → useAuthStore.setSession → root layout redirects
 * 5. On error → inline error message
 */
export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] =
    useState<Role.CUSTOMER | Role.STAFF | Role.SHOP_OWNER>(Role.CUSTOMER);

  // Client-side validation errors
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const { mutate: register, isPending, error, reset } = useRegister();

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

  const serverError = error?.message ?? null;

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={['#1A1A2E', '#16213E', '#0F3460']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Decorative orbs */}
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
              Create your account to get started
            </Text>
          </Animated.View>

          {/* Register Form Card */}
          <Animated.View
            entering={FadeInDown.duration(800).delay(300)}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>Create Account</Text>

            <View style={styles.form}>
              {/* Role Selector */}
              <View style={styles.roleSelector}>
                <Pressable
                  onPress={() => setSelectedRole(Role.CUSTOMER)}
                  style={[
                    styles.roleOption,
                    selectedRole === Role.CUSTOMER ? styles.roleOptionActive : null,
                  ]}
                >
                  <Text style={styles.roleEmoji}>🛒</Text>
                  <Text
                    style={[
                      styles.roleLabel,
                      selectedRole === Role.CUSTOMER ? styles.roleLabelActive : null,
                    ]}
                  >
                    Customer
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setSelectedRole(Role.SHOP_OWNER)}
                  style={[
                    styles.roleOption,
                    selectedRole === Role.SHOP_OWNER ? styles.roleOptionActive : null,
                  ]}
                >
                  <Text style={styles.roleEmoji}>🏪</Text>
                  <Text
                    style={[
                      styles.roleLabel,
                      selectedRole === Role.SHOP_OWNER ? styles.roleLabelActive : null,
                    ]}
                  >
                    Shop Owner
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setSelectedRole(Role.STAFF)}
                  style={[
                    styles.roleOption,
                    selectedRole === Role.STAFF ? styles.roleOptionActive : null,
                  ]}
                >
                  <Text style={styles.roleEmoji}>👥</Text>
                  <Text
                    style={[
                      styles.roleLabel,
                      selectedRole === Role.STAFF ? styles.roleLabelActive : null,
                    ]}
                  >
                    Staff
                  </Text>
                </Pressable>
              </View>

              {/* Name Input */}
              <Input
                label="Full Name"
                placeholder="Enter your full name"
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (validationErrors.name) {
                    setValidationErrors((prev) => {
                      const next = { ...prev };
                      delete next.name;
                      return next;
                    });
                  }
                }}
                autoCapitalize="words"
                autoComplete="name"
                returnKeyType="next"
                error={validationErrors.name}
                testID="register-name-input"
              />

              {/* Email Input */}
              <Input
                label="Email"
                placeholder="you@university.edu"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (validationErrors.email) {
                    setValidationErrors((prev) => {
                      const next = { ...prev };
                      delete next.email;
                      return next;
                    });
                  }
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                returnKeyType="next"
                error={validationErrors.email}
                testID="register-email-input"
              />

              {/* Phone Input (Optional) */}
              <Input
                label="Phone (Optional)"
                placeholder="+880 1XXX-XXXXXX"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoComplete="tel"
                returnKeyType="next"
                testID="register-phone-input"
              />

              {/* Password Input */}
              <Input
                label="Password"
                placeholder="At least 6 characters"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (validationErrors.password) {
                    setValidationErrors((prev) => {
                      const next = { ...prev };
                      delete next.password;
                      return next;
                    });
                  }
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="new-password"
                returnKeyType="next"
                error={validationErrors.password}
                testID="register-password-input"
                rightIcon={
                  <Text style={styles.eyeIcon}>
                    {showPassword ? '🙈' : '👁️'}
                  </Text>
                }
                onRightIconPress={() => setShowPassword((prev) => !prev)}
              />

              {/* Confirm Password Input */}
              <Input
                label="Confirm Password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (validationErrors.confirmPassword) {
                    setValidationErrors((prev) => {
                      const next = { ...prev };
                      delete next.confirmPassword;
                      return next;
                    });
                  }
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleRegister}
                error={validationErrors.confirmPassword}
                testID="register-confirm-password-input"
              />

              {/* Server Error */}
              {serverError ? (
                <Animated.View
                  entering={FadeInDown.duration(300)}
                  style={styles.errorContainer}
                >
                  <Text style={styles.errorText}>⚠️ {serverError}</Text>
                </Animated.View>
              ) : null}

              {/* Register Button */}
              <Button
                onPress={handleRegister}
                isLoading={isPending}
                size="lg"
                testID="register-submit-button"
              >
                <ButtonText>Create Account</ButtonText>
              </Button>
            </View>
          </Animated.View>

          {/* Login Link */}
          <Animated.View
            entering={FadeInDown.duration(800).delay(500)}
            style={styles.footer}
          >
            <Text style={styles.footerText}>Already have an account? </Text>
            <Pressable onPress={navigateToLogin} hitSlop={8}>
              <Text style={styles.footerLink}>Sign In</Text>
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
    paddingVertical: spacing['2xl'],
  },

  // Decorative orbs
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

  // Header
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  logoIcon: {
    fontSize: 36,
  },
  logoText: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.bodySm,
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
    gap: spacing.md,
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
    marginBottom: spacing.xs,
  },

  // Form
  form: {
    gap: spacing.md,
  },
  eyeIcon: {
    fontSize: 18,
  },

  // Role Selector
  roleSelector: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  roleOption: {
    flexBasis: '30%',
    flexGrow: 1,
    minWidth: 96,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  roleOptionActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
  },
  roleEmoji: {
    fontSize: 20,
  },
  roleLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  roleLabelActive: {
    color: colors.primary,
    fontWeight: '600',
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
    marginTop: spacing.xl,
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
