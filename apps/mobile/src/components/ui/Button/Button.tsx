import React, { createContext, useContext } from 'react';
import {
  Pressable,
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '@/config/theme';

// ─── Variant system ────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonContextType {
  variant: ButtonVariant;
  size: ButtonSize;
  disabled: boolean;
  isLoading: boolean;
}

const ButtonContext = createContext<ButtonContextType>({
  variant: 'primary',
  size: 'md',
  disabled: false,
  isLoading: false,
});

// ─── Variant styles ────────────────────────────────────────────

const variantStyles: Record<ButtonVariant, ViewStyle> = {
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.error,
  },
};

const variantTextColors: Record<ButtonVariant, string> = {
  primary: colors.textInverse,
  secondary: colors.primary,
  ghost: colors.primary,
  danger: '#FFFFFF',
};

const sizeStyles: Record<ButtonSize, ViewStyle> = {
  sm: { minHeight: 36, paddingHorizontal: spacing.md },
  md: { minHeight: 48, paddingHorizontal: spacing.xl },
  lg: { minHeight: 56, paddingHorizontal: spacing['2xl'] },
};

const sizeTextStyles: Record<ButtonSize, TextStyle> = {
  sm: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  md: { ...typography.button },
  lg: { fontSize: 18, fontWeight: '700', lineHeight: 28 },
};

// ─── Button (root) ─────────────────────────────────────────────

export interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  isLoading?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  /** Unique identifier for testing */
  testID?: string;
}

/**
 * Compound button component.
 *
 * Usage:
 * ```
 * <Button onPress={handleLogin} isLoading={isPending}>
 *   <ButtonText>Sign In</ButtonText>
 * </Button>
 * ```
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  isLoading = false,
  onPress,
  style,
  testID,
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <ButtonContext.Provider value={{ variant, size, disabled: isDisabled, isLoading }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
        onPress={onPress}
        disabled={isDisabled}
        testID={testID}
        style={({ pressed }) => [
          styles.root,
          variantStyles[variant],
          sizeStyles[size],
          isDisabled ? styles.disabled : null,
          pressed && !isDisabled ? styles.pressed : null,
          style,
        ]}
      >
        {isLoading ? (
          <ActivityIndicator
            size="small"
            color={variantTextColors[variant]}
          />
        ) : (
          <View style={styles.content}>{children}</View>
        )}
      </Pressable>
    </ButtonContext.Provider>
  );
}

// ─── ButtonText ────────────────────────────────────────────────

export interface ButtonTextProps {
  children: string;
  style?: TextStyle;
}

export function ButtonText({ children, style }: ButtonTextProps) {
  const { variant, size } = useContext(ButtonContext);

  return (
    <Text
      style={[
        sizeTextStyles[size],
        { color: variantTextColors[variant] },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

// ─── ButtonIcon ────────────────────────────────────────────────

export interface ButtonIconProps {
  children: React.ReactNode;
}

export function ButtonIcon({ children }: ButtonIconProps) {
  return <View style={styles.icon}>{children}</View>;
}

// ─── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    borderCurve: 'continuous',
    gap: spacing.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
