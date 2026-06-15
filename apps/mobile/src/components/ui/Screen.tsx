import React from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmbientBackground } from './AmbientBackground';

export interface ScreenProps {
  children: React.ReactNode;
  /** Scrollable content area (default true). Set false for fixed layouts. */
  scroll?: boolean;
  /** Safe-area edges to pad. Top defaults on; bottom defaults off (tab bars own it). */
  edges?: { top?: boolean; bottom?: boolean };
  /** Mount the ambient animated background (default true). */
  ambient?: boolean;
  contentContainerStyle?: ViewStyle;
  scrollProps?: ScrollViewProps;
}

/**
 * F5 — `Screen` primitive.
 *
 * The root wrapper every screen uses (Fork 6 / spec §5.2): mounts the ambient
 * background, applies safe-area insets, and (when scrolling) sets
 * `contentInsetAdjustmentBehavior="automatic"` per AGENTS §4. Backgrounds stay
 * full-bleed; only content is inset.
 */
export function Screen({
  children,
  scroll = true,
  edges,
  ambient = true,
  contentContainerStyle,
  scrollProps,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const paddingTop = edges?.top === false ? 0 : insets.top;
  const paddingBottom = edges?.bottom ? insets.bottom : 0;

  return (
    <View style={styles.flex}>
      {ambient ? <AmbientBackground /> : null}
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[{ paddingTop, paddingBottom }, contentContainerStyle]}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          {...scrollProps}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, { paddingTop, paddingBottom }, contentContainerStyle]}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
