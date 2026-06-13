import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check, Plus } from 'lucide-react-native';
import { Button, ButtonIcon, ButtonText, Input, Sheet, Text } from '@/components/ui';
import { spacing, useThemeTokens } from '@/theme';
import type { AdminTemplate } from '@/features/admin/services/adminTemplatesService';

export type TemplateFormMode = 'add' | 'edit';

export interface TemplateFormValues {
  startTime: string;
  endTime: string;
}

export interface TemplateFormSheetProps {
  visible: boolean;
  mode: TemplateFormMode;
  /** Existing template when editing (pre-fills the inputs). */
  template?: AdminTemplate | null;
  onClose: () => void;
  onSubmit: (values: TemplateFormValues) => void;
  isSubmitting?: boolean;
}

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;
const DEFAULT_START = '11:30';
const DEFAULT_END = '12:00';

/**
 * Prototype `addTemplateSheet` / `editTemplateSheet`: a bottom sheet with start +
 * end time inputs (`HH:MM`, the API contract format). Add defaults to 11:30–12:00;
 * edit pre-fills from the template's window.
 */
export function TemplateFormSheet({
  visible,
  mode,
  template,
  onClose,
  onSubmit,
  isSubmitting = false,
}: TemplateFormSheetProps) {
  const { t } = useTranslation();
  const tokens = useThemeTokens();
  const [startTime, setStartTime] = useState(DEFAULT_START);
  const [endTime, setEndTime] = useState(DEFAULT_END);

  useEffect(() => {
    if (!visible) return;
    if (mode === 'edit' && template) {
      setStartTime(template.startTime);
      setEndTime(template.endTime);
    } else {
      setStartTime(DEFAULT_START);
      setEndTime(DEFAULT_END);
    }
  }, [mode, template, visible]);

  const valid = HH_MM.test(startTime.trim()) && HH_MM.test(endTime.trim());
  const isAdd = mode === 'add';

  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text variant="h3" color="textPrimary" style={styles.title}>
        {isAdd ? t('admin.addTemplate') : t('common.edit')}
      </Text>
      <View style={styles.row}>
        <Input
          containerStyle={styles.field}
          label={t('admin.startTime')}
          value={startTime}
          onChangeText={setStartTime}
          placeholder={DEFAULT_START}
          keyboardType="numbers-and-punctuation"
          autoCapitalize="none"
          testID="template-start-input"
        />
        <Input
          containerStyle={styles.field}
          label={t('admin.endTime')}
          value={endTime}
          onChangeText={setEndTime}
          placeholder={DEFAULT_END}
          keyboardType="numbers-and-punctuation"
          autoCapitalize="none"
          testID="template-end-input"
        />
      </View>
      <Button
        disabled={!valid}
        isLoading={isSubmitting}
        onPress={() => onSubmit({ startTime: startTime.trim(), endTime: endTime.trim() })}
        testID="template-submit"
      >
        <ButtonIcon>
          {isAdd ? <Plus size={18} color={tokens.onPrimary} /> : <Check size={18} color={tokens.onPrimary} />}
        </ButtonIcon>
        <ButtonText>{isAdd ? t('common.add') : t('common.save')}</ButtonText>
      </Button>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  field: {
    flex: 1,
  },
});
