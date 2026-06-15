import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react-native';
import { Button, ButtonIcon, ButtonText, Input, Sheet, Text } from '@/components/ui';
import { spacing, useThemeTokens } from '@/theme';
import type { AppConfigRow } from '@/features/admin/services/adminConfigService';

export interface EditConfigSheetProps {
  /** The config row being edited, or `null` when the sheet is closed. */
  config: AppConfigRow | null;
  onClose: () => void;
  onSave: (value: string) => void;
  isSaving?: boolean;
}

/**
 * Prototype `editConfig`: a bottom sheet with a numeric `Input` pre-filled with
 * the current value. Save persists via `PATCH /admin/config/:key`.
 */
export function EditConfigSheet({ config, onClose, onSave, isSaving = false }: EditConfigSheetProps) {
  const { t } = useTranslation();
  const tokens = useThemeTokens();
  const [value, setValue] = useState('');

  useEffect(() => {
    if (config) setValue(config.value);
  }, [config]);

  const trimmed = value.trim();
  const canSave = trimmed.length > 0 && Number.isFinite(Number(trimmed));

  return (
    <Sheet visible={config !== null} onClose={onClose}>
      <Text variant="h3" color="textPrimary" style={styles.title}>
        {t('admin.editValue')}
      </Text>
      <View style={styles.field}>
        <Input
          label={config?.key ?? ''}
          value={value}
          onChangeText={setValue}
          keyboardType="number-pad"
          testID="config-value-input"
        />
      </View>
      <Button disabled={!canSave} isLoading={isSaving} onPress={() => onSave(trimmed)} testID="config-save">
        <ButtonIcon><Check size={18} color={tokens.onPrimary} /></ButtonIcon>
        <ButtonText>{t('common.save')}</ButtonText>
      </Button>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: spacing.md,
  },
  field: {
    marginBottom: spacing.lg,
  },
});
