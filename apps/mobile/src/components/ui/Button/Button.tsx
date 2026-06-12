import React, { createContext, useContext } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { useThemeTokens } from '@/theme';
import { Text } from '@/components/ui/Text';
import type { TextVariant } from '@/theme/fonts';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonCtx {
  textColor: string;
  size: ButtonSize;
}
const Ctx = createContext<ButtonCtx>({ textColor: '#FFFFFF', size: 'md' });

export interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  isLoading?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  testID?: string;
  accessibilityLabel?: string;
}

const SIZE: Record<ButtonSize, { minHeight: number; px: number; variant: TextVariant; block: boolean }> = {
  sm: { minHeight: 40, px: 14, variant: 'label', block: false },
  md: { minHeight: 50, px: 20, variant: 'button', block: true },
  lg: { minHeight: 56, px: 24, variant: 'button', block: true },
};

/**
 * F5 — `Button` (retuned to indigo tokens). Compound: `Button` + `ButtonText` +
 * `ButtonIcon`. Press-scale 0.97 (§6). Variants primary/secondary/ghost/danger.
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
  accessibilityLabel,
}: ButtonProps) {
  const tokens = useThemeTokens();
  const isDisabled = disabled || isLoading;
  const sz = SIZE[size];

  const backgroundColor =
    variant === 'primary' ? tokens.primary : variant === 'danger' ? tokens.error : 'transparent';
  const borderColor =
    variant === 'secondary' ? tokens.primary : variant === 'ghost' ? tokens.border : 'transparent';
  const borderWidth = variant === 'secondary' || variant === 'ghost' ? 1.5 : 0;
  const textColor =
    variant === 'primary' || variant === 'danger' ? tokens.onPrimary : tokens.primary;

  return (
    <Ctx.Provider value={{ textColor, size }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
        onPress={onPress}
        disabled={isDisabled}
        testID={testID}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: isLoading }}
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [
          styles.base,
          {
            minHeight: sz.minHeight,
            paddingHorizontal: sz.px,
            width: sz.block ? '100%' : undefined,
            alignSelf: sz.block ? undefined : 'flex-start',
            backgroundColor,
            borderColor,
            borderWidth,
          },
          isDisabled ? styles.disabled : null,
          pressed && !isDisabled ? styles.pressed : null,
          style,
        ]}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={textColor} />
        ) : (
          <View style={styles.content}>{children}</View>
        )}
      </Pressable>
    </Ctx.Provider>
  );
}

export interface ButtonTextProps {
  children: string;
}
export function ButtonText({ children }: ButtonTextProps) {
  const { textColor, size } = useContext(Ctx);
  return (
    <Text variant={SIZE[size].variant} style={{ color: textColor }}>
      {children}
    </Text>
  );
}

export interface ButtonIconProps {
  children: React.ReactNode;
}
export function ButtonIcon({ children }: ButtonIconProps) {
  return <View style={styles.icon}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    borderCurve: 'continuous',
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.97 }] },
  icon: { alignItems: 'center', justifyContent: 'center' },
});
