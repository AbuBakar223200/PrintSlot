import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useThemeTokens } from '@/theme';
import { Text } from '@/components/ui/Text';
import { fontFamily } from '@/theme/fonts';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';

export interface InputProps extends TextInputProps {
  /** Label displayed above the field. */
  label?: string;
  /** Error message — turns the border red and shows below. */
  error?: string;
  /** Element rendered inside on the left (e.g. a lucide icon). */
  leftIcon?: React.ReactNode;
  /** Element rendered inside on the right (e.g. a password toggle). */
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
}

/**
 * F5 — `Input` (retuned to indigo tokens). Label/error via the `Text` primitive,
 * indigo focus border, token colors throughout.
 */
export function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  style,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const tokens = useThemeTokens();
  const language = useSettingsStore((s) => s.language);
  const [focused, setFocused] = useState(false);

  const borderColor = error ? tokens.error : focused ? tokens.primary : tokens.border;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text variant="label" color="textSecondary" style={styles.label}>
          {label}
        </Text>
      ) : null}

      <View style={[styles.inputRow, { borderColor, backgroundColor: tokens.surface }]}>
        {leftIcon ? <View style={styles.iconLeft}>{leftIcon}</View> : null}
        <TextInput
          style={[
            styles.input,
            { color: tokens.textPrimary, fontFamily: fontFamily('regular', language) },
            leftIcon ? styles.padLeft : null,
            rightIcon ? styles.padRight : null,
            style,
          ]}
          placeholderTextColor={tokens.textMuted}
          selectionColor={tokens.primary}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
        {rightIcon ? (
          <Pressable onPress={onRightIconPress} style={styles.iconRight} hitSlop={8}>
            {rightIcon}
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text variant="caption" style={[styles.error, { color: tokens.error }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: { marginLeft: 2 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    borderCurve: 'continuous',
    minHeight: 50,
  },
  input: { flex: 1, fontSize: 16, paddingHorizontal: 14, paddingVertical: 12 },
  padLeft: { paddingLeft: 6 },
  padRight: { paddingRight: 6 },
  iconLeft: { paddingLeft: 14 },
  iconRight: { paddingRight: 14 },
  error: { marginLeft: 2 },
});
