import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Switch,
} from 'react-native';
import { ColorMode, PaperSize, Orientation, PrintConfig } from '@printslot/shared';
import { Input, SegmentedControl, Text } from '@/components/ui';
import { radii, spacing, useThemeTokens } from '@/theme';
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
  const tokens = useThemeTokens();
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

  const surfaceCard = { backgroundColor: tokens.surface, borderColor: tokens.border };

  return (
    <View style={[styles.container, surfaceCard]}>
      <View style={styles.formGroup}>
        <Text variant="bodySm" color="textSecondary" style={styles.label}>{t.colorMode}</Text>
        <SegmentedControl
          getOptionTestID={(option) => `color-mode-${option}`}
          onChange={handleColorModeChange}
          options={[
            { value: ColorMode.COLOR, label: t.color },
            { value: ColorMode.BW, label: t.bw },
          ]}
          value={value.colorMode}
        />
      </View>

      <View style={styles.formGroup}>
        <Text variant="bodySm" color="textSecondary" style={styles.label}>{t.paperSize}</Text>
        <SegmentedControl
          getOptionTestID={(option) => `paper-size-${option}`}
          onChange={handlePaperSizeChange}
          options={Object.values(PaperSize).map((size) => ({ value: size, label: size }))}
          value={value.paperSize}
        />
      </View>

      <View style={styles.formGroup}>
        <Text variant="bodySm" color="textSecondary" style={styles.label}>{t.orientation}</Text>
        <SegmentedControl
          getOptionTestID={(option) => `orientation-${option}`}
          onChange={handleOrientationChange}
          options={[
            { value: Orientation.PORTRAIT, label: t.portrait },
            { value: Orientation.LANDSCAPE, label: t.landscape },
          ]}
          value={value.orientation}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text variant="bodySm" color="textSecondary" style={styles.label}>{t.copies}</Text>
          <View style={[styles.stepperContainer, surfaceCard]}>
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
              <Text variant="h3" color="textPrimary">−</Text>
            </Pressable>
            <View style={styles.stepperValueContainer}>
              <Text testID="copies-value" variant="body" color="textPrimary" tabular style={styles.bold}>
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
              <Text variant="h3" color="textPrimary">+</Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.duplexContainer, surfaceCard]}>
          <Text variant="bodySm" color="textSecondary" style={styles.semibold}>{t.doubleSided}</Text>
          <Switch
            testID="duplex-switch"
            accessibilityLabel="Toggle double-sided printing"
            value={value.duplex}
            onValueChange={handleDuplexChange}
            trackColor={{ false: tokens.border, true: tokens.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

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
        {totalPages !== null && totalPages > 0 ? (
          <Text variant="caption" color="textMuted" style={styles.helperText}>
            {totalPages} {t.pagesDetected}
          </Text>
        ) : (
          <Text variant="caption" color="textMuted" style={styles.helperText}>{t.formatHint}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bold: { fontWeight: '700' },
  semibold: { fontWeight: '600' },
  container: {
    gap: spacing.lg,
    borderRadius: radii.card,
    borderCurve: 'continuous',
    borderWidth: 1,
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
    fontWeight: '600',
    marginLeft: spacing.xs,
    marginBottom: spacing.xs,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.control,
    borderCurve: 'continuous',
    borderWidth: 1,
    padding: spacing.xs,
  },
  stepperButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    borderCurve: 'continuous',
  },
  stepperButtonDisabled: {
    opacity: 0.4,
  },
  stepperValueContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  duplexContainer: {
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radii.control,
    borderCurve: 'continuous',
    borderWidth: 1,
    padding: spacing.md,
    flexDirection: 'row',
    flex: 1,
    minHeight: 64,
    marginTop: spacing.md,
  },
  helperText: {
    marginLeft: spacing.xs,
    marginTop: spacing.xs,
  },
});
