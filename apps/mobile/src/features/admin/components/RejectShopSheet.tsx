import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { XCircle } from 'lucide-react-native';
import { Button, ButtonIcon, ButtonText, Input, Sheet, Text } from '@/components/ui';
import { spacing, useThemeTokens } from '@/theme';

export interface RejectShopSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  isSubmitting?: boolean;
}

const MIN_REASON_LENGTH = 5;

/**
 * Prototype `rejectShopSheet`: a bottom sheet with a multiline reason `Input`.
 * Submit stays disabled until the trimmed reason is ≥5 characters.
 */
export function RejectShopSheet({
  visible,
  onClose,
  onSubmit,
  isSubmitting = false,
}: RejectShopSheetProps) {
  const { t } = useTranslation();
  const tokens = useThemeTokens();
  const [reason, setReason] = useState('');

  // Reset the field whenever the sheet (re)opens so a previous reason never leaks.
  useEffect(() => {
    if (visible) setReason('');
  }, [visible]);

  const trimmed = reason.trim();
  const canSubmit = trimmed.length >= MIN_REASON_LENGTH;

  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text variant="h3" color="textPrimary" style={styles.title}>
        {t('admin.rejectTitle')}
      </Text>
      <View style={styles.field}>
        <Input
          label={t('admin.rejectReason')}
          value={reason}
          onChangeText={setReason}
          placeholder={t('admin.rejectHint')}
          multiline
          numberOfLines={3}
          style={styles.multiline}
          textAlignVertical="top"
        />
        <Text variant="caption" color="textMuted" style={styles.hint}>
          {t('admin.rejectHint')}
        </Text>
      </View>
      <Button
        variant="danger"
        disabled={!canSubmit}
        isLoading={isSubmitting}
        onPress={() => onSubmit(trimmed)}
        testID="reject-submit"
      >
        <ButtonIcon><XCircle size={18} color={tokens.onPrimary} /></ButtonIcon>
        <ButtonText>{t('admin.submitReject')}</ButtonText>
      </Button>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: spacing.md,
  },
  field: {
    gap: 4,
    marginBottom: spacing.lg,
  },
  multiline: {
    minHeight: 90,
    paddingTop: spacing.md,
  },
  hint: {
    marginLeft: 2,
  },
});
