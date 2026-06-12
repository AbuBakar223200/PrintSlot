import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ClipboardList, User, type LucideIcon } from 'lucide-react-native';
import { Text } from '@/components/ui';
import { radii, spacing, useTheme, useThemeTokens } from '@/theme';

export type StaffTabKey = 'jobs' | 'profile';

interface StaffTab {
  key: StaffTabKey;
  labelKey: string;
  icon: LucideIcon;
  href: string;
}

export interface StaffTabBarProps {
  active: StaffTabKey;
}

/** Prototype `TAB_CONFIG.STAFF`: exactly Jobs + Profile. */
const STAFF_TABS: readonly StaffTab[] = [
  { key: 'jobs', labelKey: 'tab.jobs', icon: ClipboardList, href: '/(staff)/jobs' },
  { key: 'profile', labelKey: 'tab.profile', icon: User, href: '/(staff)/profile' },
];

/**
 * Floating frosted staff tab bar from the approved prototype. Mounted by the
 * staff jobs dashboard only; the pushed full-screen job detail does not show tabs.
 */
export function StaffTabBar({ active }: StaffTabBarProps) {
  const tokens = useThemeTokens();
  const { name } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const navigate = useCallback((href: string) => {
    router.push(href as never);
  }, []);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}
    >
      <BlurView
        intensity={28}
        tint={name === 'dark' ? 'dark' : 'light'}
        style={[styles.bar, { borderColor: tokens.border }]}
      >
        <View style={[styles.tint, { backgroundColor: tokens.surfaceFrost }]}>
          {STAFF_TABS.map((tab) => {
            const isActive = tab.key === active;
            const Icon = tab.icon;
            const color = isActive ? tokens.primary : tokens.textMuted;

            return (
              <Pressable
                accessibilityLabel={t(tab.labelKey)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                key={tab.key}
                onPress={() => navigate(tab.href)}
                style={({ pressed }) => [
                  styles.tab,
                  isActive ? { backgroundColor: tokens.tintSoft } : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Icon size={22} color={color} />
                <Text variant="caption" style={{ color }} numberOfLines={1}>
                  {t(tab.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

export const STAFF_TAB_BAR_HEIGHT = 104;

const styles = StyleSheet.create({
  wrap: {
    bottom: 0,
    left: 0,
    paddingHorizontal: spacing.lg,
    position: 'absolute',
    right: 0,
    zIndex: 20,
  },
  bar: {
    borderCurve: 'continuous',
    borderRadius: 26,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tint: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
  },
  tab: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: radii.control,
    flex: 1,
    gap: 3,
    justifyContent: 'center',
    minHeight: 58,
    paddingHorizontal: 2,
    paddingVertical: 7,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }],
  },
});
