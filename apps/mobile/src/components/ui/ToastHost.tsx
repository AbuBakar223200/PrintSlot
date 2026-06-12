import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeTokens } from '@/theme';
import { Text } from './Text';
import { useToastStore } from './toast';

/**
 * F5 — `ToastHost`. Mount once at the app root; renders the toast queue above the
 * tab bar. Non-interactive (pointer-events none).
 */
export function ToastHost() {
  const tokens = useThemeTokens();
  const insets = useSafeAreaInsets();
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <View pointerEvents="none" style={[styles.wrap, { bottom: insets.bottom + 90 }]}>
      {toasts.map((t) => {
        const Icon = t.icon;
        const iconColor =
          t.tone === 'error' ? tokens.error : t.tone === 'info' ? tokens.info : tokens.success;
        return (
          <View key={t.id} style={[styles.toast, { backgroundColor: tokens.toastSurface }]}>
            {Icon ? <Icon size={17} color={iconColor} /> : null}
            <Text variant="bodySm" style={{ color: tokens.toastText }}>
              {t.message}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 8 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    borderCurve: 'continuous',
    maxWidth: 320,
  },
});
