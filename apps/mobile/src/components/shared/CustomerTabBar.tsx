import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Bell, Home, Receipt, Wallet, type LucideIcon } from 'lucide-react-native';
import { Text } from '@/components/ui';
import { radii, spacing, useTheme, useThemeTokens } from '@/theme';

export type CustomerTabKey = 'home' | 'orders' | 'wallet' | 'notifications';

interface CustomerTab {
  key: CustomerTabKey;
  labelKey: string;
  icon: LucideIcon;
  href: string;
}

export interface CustomerTabBarProps {
  active: CustomerTabKey;
  unreadCount?: number;
}

const CUSTOMER_TABS: readonly CustomerTab[] = [
  { key: 'home', labelKey: 'tab.home', icon: Home, href: '/(customer)' },
  { key: 'orders', labelKey: 'tab.orders', icon: Receipt, href: '/(customer)/orders' },
  { key: 'wallet', labelKey: 'tab.wallet', icon: Wallet, href: '/(customer)/wallet' },
  { key: 'notifications', labelKey: 'tab.notifications', icon: Bell, href: '/(customer)/notifications' },
];

/**
 * Floating frosted customer tab bar from the approved prototype.
 * Mounted by top-level customer tab screens; detail/wizard/profile routes stay
 * full-screen and do not show tabs.
 */
export function CustomerTabBar({ active, unreadCount = 0 }: CustomerTabBarProps) {
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
          {CUSTOMER_TABS.map((tab) => {
            const isActive = tab.key === active;
            const Icon = tab.icon;
            const color = isActive ? tokens.primary : tokens.textMuted;
            const isNotifications = tab.key === 'notifications';

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
                <View>
                  <Icon size={22} color={color} />
                  {isNotifications && unreadCount > 0 ? (
                    <View style={[styles.badge, { backgroundColor: tokens.error }]}>
                      <Text variant="caption" style={styles.badgeText} tabular>
                        {String(Math.min(unreadCount, 99))}
                      </Text>
                    </View>
                  ) : null}
                </View>
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

export const CUSTOMER_TAB_BAR_HEIGHT = 104;

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
  badge: {
    alignItems: 'center',
    borderRadius: radii.full,
    height: 17,
    justifyContent: 'center',
    minWidth: 17,
    paddingHorizontal: 4,
    position: 'absolute',
    right: -9,
    top: -7,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
});
