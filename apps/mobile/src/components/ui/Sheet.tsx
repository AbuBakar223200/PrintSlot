import React from 'react';
import { Modal, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { useThemeTokens } from '@/theme';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * F5 — `Sheet` primitive (spec §5.4 / Fork 8).
 *
 * A native RN `<Modal>` (NOT a JS bottom-sheet library) presented as a slide-up
 * bottom sheet — the prototype's look. (Visual choice → prototype wins; behavior
 * unchanged.) Tap the scrim or call `onClose` to dismiss.
 */
export function Sheet({ visible, onClose, children, style }: SheetProps) {
  const tokens = useThemeTokens();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={[styles.scrim, { backgroundColor: tokens.scrim }]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <Pressable
          style={[styles.sheet, { backgroundColor: tokens.surface, borderColor: tokens.border }, style]}
          onPress={() => undefined}
        >
          <View style={[styles.grip, { backgroundColor: tokens.border }]} />
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28,
  },
  grip: { width: 40, height: 4, borderRadius: 9999, alignSelf: 'center', marginBottom: 14 },
});
