import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { Language } from '@printslot/shared';
import {
  Avatar,
  Banner,
  Button,
  ButtonText,
  Card,
  FrostCard,
  Input,
  Screen,
  SegmentedControl,
  Text,
} from '@/components/ui';
import { spacing } from '@/theme';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import {
  useSettingsStore,
  type ThemePreference,
} from '@/features/settings/store/useSettingsStore';
import { useUpdateProfile } from '../hooks/useProfile';
import { useLogout } from '../hooks/useLogout';
import { UpdateProfileSchema } from '../dto/updateProfile.dto';

const LANGUAGE_OPTIONS: ReadonlyArray<{ value: Language; label: string }> = [
  { value: Language.EN, label: 'English' },
  { value: Language.BN, label: 'বাংলা' },
];

const THEME_OPTIONS: ReadonlyArray<{ value: ThemePreference; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

/**
 * Shared Profile hub (spec §8.11) — mounted at /(role)/profile for every role.
 * Self-data + preferences + logout. Reached via the header avatar on each home.
 *
 * Fields: name, phone (PATCH /users/me). Preferences: Language (Fork 11) + Theme
 * (Fork 2), wired to the settings store. Logout fires best-effort device
 * unregistration then clearSession.
 */
export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const { mutate: updateProfile, isPending, error, reset } = useUpdateProfile();
  const logout = useLogout();

  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const themePreference = useSettingsStore((s) => s.themePreference);
  const setThemePreference = useSettingsStore((s) => s.setThemePreference);

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [fieldError, setFieldError] = useState<string | null>(null);

  // Sync form fields when the auth user changes — handles first-mount-before-hydration,
  // post-save server normalization (trimmed values), and logout->relogin flows.
  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setPhone(user.phone ?? '');
  }, [user?.id, user?.updatedAt]);

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
      <Screen contentContainerStyle={styles.loading}>
        <Text variant="body" color="textSecondary" align="center">Loading…</Text>
      </Screen>
    );
  }

  const errorMessage = fieldError ?? error?.message ?? null;

  return (
    <Screen contentContainerStyle={styles.content}>
      <FrostCard pad={20}>
        <View style={styles.hero}>
          <Avatar name={user.name} size="lg" />
          <View style={styles.heroText}>
            <Text variant="h3" color="textPrimary" numberOfLines={1}>{user.name}</Text>
            <Text variant="bodySm" color="textMuted" numberOfLines={1}>{user.email}</Text>
          </View>
        </View>
      </FrostCard>

      <View style={styles.section}>
        <Text variant="h3" color="textPrimary">Account</Text>
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
          <Banner tone="error" icon={AlertTriangle}>{errorMessage}</Banner>
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

      <View style={styles.section}>
        <Text variant="h3" color="textPrimary">Preferences</Text>
        <Card>
          <View style={styles.pref}>
            <Text variant="label" color="textSecondary" style={styles.prefLabel}>Language</Text>
            <SegmentedControl
              options={LANGUAGE_OPTIONS}
              value={language}
              onChange={setLanguage}
            />
          </View>
          <View style={styles.pref}>
            <Text variant="label" color="textSecondary" style={styles.prefLabel}>Theme</Text>
            <SegmentedControl
              options={THEME_OPTIONS}
              value={themePreference}
              onChange={setThemePreference}
            />
          </View>
        </Card>
      </View>

      <Button
        onPress={handleLogout}
        variant="danger"
        size="lg"
        testID="profile-logout-button"
      >
        <ButtonText>Log out</ButtonText>
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.xl,
    gap: spacing.xl,
  },
  loading: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  heroText: {
    flex: 1,
    gap: 2,
  },
  section: {
    gap: spacing.md,
  },
  pref: {
    gap: spacing.sm,
  },
  prefLabel: {
    marginLeft: 2,
  },
});
