import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Pressable,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '@/config/theme';

export interface InputProps extends TextInputProps {
  /** Label displayed above the input */
  label?: string;
  /** Error message — turns border red */
  error?: string;
  /** Icon component rendered on the left */
  leftIcon?: React.ReactNode;
  /** Icon component rendered on the right (e.g. password toggle) */
  rightIcon?: React.ReactNode;
  /** Called when right icon is pressed */
  onRightIconPress?: () => void;
  /** Container style override */
  containerStyle?: ViewStyle;
}

/**
 * Styled text input with label, error state, and icon support.
 * Part of the PrintSlot design system.
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
  const [isFocused, setIsFocused] = useState(false);

  const borderColor = error
    ? colors.error
    : isFocused
      ? colors.borderFocus
      : colors.border;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={[styles.inputContainer, { borderColor }]}>
        {leftIcon ? <View style={styles.iconLeft}>{leftIcon}</View> : null}

        <TextInput
          style={[
            styles.input,
            leftIcon ? styles.inputWithLeftIcon : null,
            rightIcon ? styles.inputWithRightIcon : null,
            style,
          ]}
          placeholderTextColor={colors.textTertiary}
          selectionColor={colors.primary}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />

        {rightIcon ? (
          <Pressable
            onPress={onRightIconPress}
            style={styles.iconRight}
            hitSlop={8}
          >
            {rightIcon}
          </Pressable>
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    ...typography.bodySm,
    color: colors.textSecondary,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1.5,
    borderRadius: borderRadius.md,
    borderCurve: 'continuous',
    minHeight: 52,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  inputWithLeftIcon: {
    paddingLeft: spacing.xs,
  },
  inputWithRightIcon: {
    paddingRight: spacing.xs,
  },
  iconLeft: {
    paddingLeft: spacing.lg,
  },
  iconRight: {
    paddingRight: spacing.lg,
  },
  error: {
    ...typography.caption,
    color: colors.error,
    marginLeft: spacing.xs,
  },
});
