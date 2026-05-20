import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Switch,
} from 'react-native';
import { ColorMode, PaperSize, Orientation, PrintConfig } from '@printslot/shared';
import { colors, spacing, borderRadius, typography } from '@/config/theme';
import { Input } from '@/components/ui/Input';
import { parsePageRange } from '../../utils/pageRange';

export interface PrintConfigFormProps {
  value: PrintConfig;
  detectedPages: number | null;
  manualPages: number | null;
  onChange: (next: PrintConfig) => void;
  onValidChange?: (isValid: boolean, error?: string) => void;
}

// Simple translation dictionary for foresight integration when i18n ships in Slice 33
const t = {
  colorMode: 'Color Mode',
  color: 'COLOR',
  bw: 'B&W',
  paperSize: 'Paper Size',
  orientation: 'Orientation',
  portrait: 'Portrait',
  landscape: 'Landscape',
  copies: 'Copies',
  doubleSided: 'Double-Sided',
  pageRange: 'Page Range',
  pageRangePlaceholder: 'e.g. 1-5, 7, 9-11',
  pagesDetected: 'pages detected',
  formatHint: 'Format: comma-separated pages or ranges (e.g. 1-3,5)',
};

export function PrintConfigForm({
  value,
  detectedPages,
  manualPages,
  onChange,
  onValidChange,
}: PrintConfigFormProps) {
  const [errorStr, setErrorStr] = useState<string | undefined>(undefined);

  const totalPages = detectedPages !== null ? detectedPages : manualPages;

  // Real-time client-side range validation
  useEffect(() => {
    try {
      parsePageRange(value.pageRange, totalPages);
      setErrorStr(undefined);
      onValidChange?.(true);
    } catch (e: any) {
      const msg = e.message || 'Invalid page range';
      setErrorStr(msg);
      onValidChange?.(false, msg);
    }
  }, [value.pageRange, totalPages]);

  const handleColorModeChange = (mode: ColorMode) => {
    onChange({ ...value, colorMode: mode });
  };

  const handlePaperSizeChange = (size: PaperSize) => {
    onChange({ ...value, paperSize: size });
  };

  const handleOrientationChange = (orientation: Orientation) => {
    onChange({ ...value, orientation });
  };

  const handleIncrement = () => {
    if (value.copies < 100) {
      onChange({ ...value, copies: value.copies + 1 });
    }
  };

  const handleDecrement = () => {
    if (value.copies > 1) {
      onChange({ ...value, copies: value.copies - 1 });
    }
  };

  const handleDuplexChange = (duplex: boolean) => {
    onChange({ ...value, duplex });
  };

  const handlePageRangeChange = (text: string) => {
    onChange({ ...value, pageRange: text === '' ? null : text });
  };

  return (
    <View style={styles.container}>
      {/* 1. Color Mode Option */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t.colorMode}</Text>
        <View style={styles.segmentedContainer}>
          <Pressable
            testID="color-mode-COLOR"
            accessibilityLabel={`Set Color Mode to ${t.color}`}
            onPress={() => handleColorModeChange(ColorMode.COLOR)}
            style={[
              styles.segment,
              value.colorMode === ColorMode.COLOR ? styles.segmentActive : null,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                value.colorMode === ColorMode.COLOR ? styles.segmentTextActive : null,
              ]}
            >
              {t.color}
            </Text>
          </Pressable>
          <Pressable
            testID="color-mode-BW"
            accessibilityLabel={`Set Color Mode to ${t.bw}`}
            onPress={() => handleColorModeChange(ColorMode.BW)}
            style={[
              styles.segment,
              value.colorMode === ColorMode.BW ? styles.segmentActive : null,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                value.colorMode === ColorMode.BW ? styles.segmentTextActive : null,
              ]}
            >
              {t.bw}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* 2. Paper Size Option */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t.paperSize}</Text>
        <View style={styles.segmentedContainer}>
          {Object.values(PaperSize).map((size) => (
            <Pressable
              key={size}
              testID={`paper-size-${size}`}
              accessibilityLabel={`Set Paper Size to ${size}`}
              onPress={() => handlePaperSizeChange(size)}
              style={[
                styles.segment,
                value.paperSize === size ? styles.segmentActive : null,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  value.paperSize === size ? styles.segmentTextActive : null,
                ]}
              >
                {size}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* 3. Orientation Option */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t.orientation}</Text>
        <View style={styles.segmentedContainer}>
          <Pressable
            testID="orientation-PORTRAIT"
            accessibilityLabel={`Set Orientation to ${t.portrait}`}
            onPress={() => handleOrientationChange(Orientation.PORTRAIT)}
            style={[
              styles.segment,
              value.orientation === Orientation.PORTRAIT ? styles.segmentActive : null,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                value.orientation === Orientation.PORTRAIT ? styles.segmentTextActive : null,
              ]}
            >
              {t.portrait}
            </Text>
          </Pressable>
          <Pressable
            testID="orientation-LANDSCAPE"
            accessibilityLabel={`Set Orientation to ${t.landscape}`}
            onPress={() => handleOrientationChange(Orientation.LANDSCAPE)}
            style={[
              styles.segment,
              value.orientation === Orientation.LANDSCAPE ? styles.segmentActive : null,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                value.orientation === Orientation.LANDSCAPE ? styles.segmentTextActive : null,
              ]}
            >
              {t.landscape}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.row}>
        {/* 4. Copies Stepper Option */}
        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={styles.label}>{t.copies}</Text>
          <View style={styles.stepperContainer}>
            <Pressable
              testID="copies-decrement"
              accessibilityLabel="Decrement copies"
              onPress={handleDecrement}
              disabled={value.copies <= 1}
              style={[
                styles.stepperButton,
                value.copies <= 1 ? styles.stepperButtonDisabled : null,
              ]}
            >
              <Text style={styles.stepperButtonText}>−</Text>
            </Pressable>
            <View style={styles.stepperValueContainer}>
              <Text testID="copies-value" style={styles.stepperValueText}>
                {value.copies}
              </Text>
            </View>
            <Pressable
              testID="copies-increment"
              accessibilityLabel="Increment copies"
              onPress={handleIncrement}
              disabled={value.copies >= 100}
              style={[
                styles.stepperButton,
                value.copies >= 100 ? styles.stepperButtonDisabled : null,
              ]}
            >
              <Text style={styles.stepperButtonText}>+</Text>
            </Pressable>
          </View>
        </View>

        {/* 5. Duplex Option */}
        <View style={styles.duplexContainer}>
          <Text style={[styles.label, { marginBottom: 0 }]}>{t.doubleSided}</Text>
          <Switch
            testID="duplex-switch"
            accessibilityLabel="Toggle double-sided printing"
            value={value.duplex}
            onValueChange={handleDuplexChange}
            trackColor={{ false: colors.borderLight, true: colors.primary }}
            thumbColor={colors.textPrimary}
          />
        </View>
      </View>

      {/* 6. Page Range Option */}
      <View style={styles.formGroup}>
        <Input
          testID="page-range-input"
          label={t.pageRange}
          placeholder={t.pageRangePlaceholder}
          value={value.pageRange ?? ''}
          onChangeText={handlePageRangeChange}
          keyboardType="default"
          autoCapitalize="none"
          autoCorrect={false}
          error={errorStr}
        />
        {/* Info or Hint Text without leaking raw falsy logic */}
        {totalPages !== null && totalPages > 0 ? (
          <Text style={styles.helperText}>
            {totalPages} {t.pagesDetected}
          </Text>
        ) : (
          <Text style={styles.helperText}>{t.formatHint}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
    backgroundColor: colors.glassBg,
    borderRadius: borderRadius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  formGroup: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  label: {
    ...typography.bodySm,
    color: colors.textSecondary,
    fontWeight: '600',
    marginLeft: spacing.xs,
    marginBottom: spacing.xs,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    borderCurve: 'continuous',
    padding: spacing.xs,
    gap: spacing.xs,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
    borderCurve: 'continuous',
  },
  segmentActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    borderCurve: 'continuous',
    padding: spacing.xs,
  },
  stepperButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.borderLight,
    borderRadius: borderRadius.sm,
    borderCurve: 'continuous',
  },
  stepperButtonDisabled: {
    opacity: 0.4,
  },
  stepperButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  stepperValueContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValueText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  duplexContainer: {
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    borderCurve: 'continuous',
    padding: spacing.md,
    flexDirection: 'row',
    flex: 1,
    minHeight: 64,
    marginTop: spacing.md,
  },
  helperText: {
    ...typography.caption,
    color: colors.textTertiary,
    marginLeft: spacing.xs,
    marginTop: spacing.xs,
  },
});
