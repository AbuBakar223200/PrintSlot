import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { router, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui';
import { ADMIN_TAB_ICONS } from '@/components/ui/icons';
import { radii, spacing, useTheme, useThemeTokens } from '@/theme';

export type AdminTabKey = 'shops' | 'analytics' | 'config' | 'templates';

interface AdminTab {
  key: AdminTabKey;
  href: Href;
}

export interface AdminTabBarProps {
  active: AdminTabKey;
}

/**
 * Prototype `TAB_CONFIG.PLATFORM_ADMIN`: Shops · Analytics · Config · Templates.
 * Glyphs + label keys come straight from `ADMIN_TAB_ICONS` so the tab bar stays
 * in lockstep with the icon system.
 *
 * Cast: admin routes are new and may not be in the generated typed-routes union
 * yet, so `href` is typed as `Href` and `router.push` receives `href as never`
 * (the same pattern `CustomerTabBar`/`OwnerTabBar` use).
 */
const ADMIN_TABS: readonly AdminTab[] = [
  { key: 'shops', href: '/(admin)/shops' as Href },
  { key: 'analytics', href: '/(admin)/analytics' as Href },
  { key: 'config', href: '/(admin)/config' as Href },
  { key: 'templates', href: '/(admin)/templates' as Href },
];

/**
 * Floating frosted platform-admin tab bar from the approved prototype. Mounted by
 * the four admin top-level screens; pushed full-screen routes (profile) do not
 * show tabs.
 */
export function AdminTabBar({ active }: AdminTabBarProps) {
  const tokens = useThemeTokens();
  const { name } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const navigate = useCallback((href: Href) => {
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
          {ADMIN_TABS.map((tab, index) => {
            const isActive = tab.key === active;
            const Icon = ADMIN_TAB_ICONS[index].icon;
            const labelKey = ADMIN_TAB_ICONS[index].labelKey;
            const color = isActive ? tokens.primary : tokens.textMuted;

            return (
              <Pressable
                accessibilityLabel={t(labelKey)}
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
                <Icon size={20} color={color} />
                <Text variant="caption" style={[styles.label, { color }]} numberOfLines={1}>
                  {t(labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

export const ADMIN_TAB_BAR_HEIGHT = 112;

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
    padding: spacing.sm,
  },
  tab: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: 16,
    flex: 1,
    gap: 3,
    justifyContent: 'center',
    minHeight: 58,
    paddingHorizontal: 2,
    paddingVertical: 7,
  },
  label: {
    fontSize: 10,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }],
  },
});
