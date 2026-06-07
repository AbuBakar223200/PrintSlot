import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import type { PrintConfig } from '@printslot/shared';
import { PrintConfigForm } from '@/components/shared/PrintConfigForm';
import { borderRadius, colors, spacing, typography } from '@/config/theme';
import { Input } from '@/components/ui/Input';
import { uploadKeys, uploadText } from '../i18n/uploadCopy';
import type { WizardFile } from '../types';

export interface FilePickerCardProps {
  file: WizardFile;
  onChange: (localId: string, patch: Partial<WizardFile>) => void;
  onRemove: (localId: string) => void;
  onRetry: (localId: string) => void;
}

function trimTrailingZero(value: string): string {
  return value.endsWith('.0') ? value.slice(0, -2) : value;
}

export function formatFileSize(size: number | null): string {
  if (size === null) {
    return '0 B';
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${trimTrailingZero((size / 1024).toFixed(1))} KB`;
  }

  return `${trimTrailingZero((size / (1024 * 1024)).toFixed(1))} MB`;
}

function imageThumbUrl(url: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}w=120&h=120&c=fill&q=auto&f=auto`;
}

function extensionLabel(name: string, mimeType: string): string {
  const extension = name.split('.').pop();

  if (extension && extension !== name) {
    return extension.slice(0, 4).toUpperCase();
  }

  if (mimeType.includes('/')) {
    return mimeType.split('/')[1].slice(0, 4).toUpperCase();
  }

  return uploadText(uploadKeys.fileType);
}

function isPdfMime(mimeType: string): boolean {
  return mimeType === 'application/pdf';
}

function FilePickerCardComponent({
  file,
  onChange,
  onRemove,
  onRetry,
}: FilePickerCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const mimeType = file.upload?.mimeType ?? file.localFile.mimeType;
  const fileName = file.upload?.fileName ?? file.localFile.name;
  const fileSize = file.upload?.fileSize ?? file.localFile.size;
  const isPdf = isPdfMime(mimeType);
  const isImage = mimeType.startsWith('image/');
  const detectedPages = file.upload?.detectedPages ?? null;
  const totalPages = detectedPages ?? file.manualPages;
  const needsManualPages = !isPdf;
  const manualPagesError = needsManualPages && file.manualPages === null
    ? uploadText(uploadKeys.manualPagesRequired)
    : undefined;

  const imageUri = useMemo(() => {
    if (!isImage) {
      return null;
    }

    return file.upload?.fileUrl
      ? imageThumbUrl(file.upload.fileUrl)
      : file.localFile.uri;
  }, [file.localFile.uri, file.upload?.fileUrl, isImage]);

  const handleRemove = useCallback(() => {
    onRemove(file.localId);
  }, [file.localId, onRemove]);

  const handleRetry = useCallback(() => {
    onRetry(file.localId);
  }, [file.localId, onRetry]);

  const handleToggleExpanded = useCallback(() => {
    setIsExpanded((current) => !current);
  }, []);

  const handleManualPagesChange = useCallback((text: string) => {
    const parsed = Number.parseInt(text, 10);
    const manualPages = Number.isFinite(parsed) && parsed > 0 ? parsed : null;

    onChange(file.localId, {
      manualPages,
      configValid: isPdf || manualPages !== null,
      configError: manualPages === null && !isPdf
        ? uploadText(uploadKeys.manualPagesRequired)
        : undefined,
    });
  }, [file.localId, isPdf, onChange]);

  const handleConfigChange = useCallback((config: PrintConfig) => {
    onChange(file.localId, { config });
  }, [file.localId, onChange]);

  const handleValidChange = useCallback((isValid: boolean, error?: string) => {
    const hasRequiredPages = isPdf || file.manualPages !== null;
    onChange(file.localId, {
      configValid: hasRequiredPages && isValid,
      configError: hasRequiredPages ? error : uploadText(uploadKeys.manualPagesRequired),
    });
  }, [file.localId, file.manualPages, isPdf, onChange]);

  return (
    <View style={styles.card} testID={`file-card-${file.localId}`}>
      <View style={styles.topRow}>
        <View style={styles.preview}>
          {imageUri ? (
            <Image
              cachePolicy="memory-disk"
              contentFit="cover"
              recyclingKey={file.localId}
              source={{ uri: imageUri }}
              style={styles.previewImage}
            />
          ) : (
            <Text style={styles.previewText}>{extensionLabel(fileName, mimeType)}</Text>
          )}
        </View>

        <View style={styles.fileInfo}>
          <Text numberOfLines={1} style={styles.fileName}>{fileName}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{formatFileSize(fileSize)}</Text>
            {totalPages !== null ? (
              <Text style={styles.pagesBadge}>
                {uploadText(uploadKeys.pages, { count: totalPages })}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.statusColumn}>
          {file.uploadStatus === 'uploading' ? (
            <ActivityIndicator
              color={colors.primary}
              size="small"
              testID={`file-uploading-${file.localId}`}
            />
          ) : null}
          {file.uploadStatus === 'done' ? (
            <Text style={[styles.statusText, styles.statusDone]}>
              {uploadText(uploadKeys.uploaded)}
            </Text>
          ) : null}
          {file.uploadStatus === 'error' ? (
            <Text style={[styles.statusText, styles.statusError]}>
              {uploadText(uploadKeys.error)}
            </Text>
          ) : null}
          {file.uploadStatus === 'pending' ? (
            <Text style={styles.statusText}>{uploadText(uploadKeys.pending)}</Text>
          ) : null}
        </View>
      </View>

      {needsManualPages ? (
        <Input
          containerStyle={styles.manualPagesInput}
          error={manualPagesError}
          keyboardType="number-pad"
          label={uploadText(uploadKeys.manualPages)}
          onChangeText={handleManualPagesChange}
          placeholder={uploadText(uploadKeys.manualPagesPlaceholder)}
          testID={`manual-pages-${file.localId}`}
          value={file.manualPages === null ? '' : String(file.manualPages)}
        />
      ) : null}

      {file.uploadStatus === 'error' ? (
        <View style={styles.errorRow}>
          <Text style={styles.errorText}>
            {file.uploadError ?? uploadText(uploadKeys.error)}
          </Text>
          <Pressable
            accessibilityLabel={uploadText(uploadKeys.retry)}
            accessibilityRole="button"
            onPress={handleRetry}
            style={styles.inlineButton}
            testID={`file-retry-${file.localId}`}
          >
            <Text style={styles.inlineButtonText}>{uploadText(uploadKeys.retry)}</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.actionRow}>
        <Pressable
          accessibilityLabel={isExpanded
            ? uploadText(uploadKeys.collapse)
            : uploadText(uploadKeys.configure)}
          accessibilityRole="button"
          onPress={handleToggleExpanded}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>
            {isExpanded ? uploadText(uploadKeys.collapse) : uploadText(uploadKeys.configure)}
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel={uploadText(uploadKeys.remove)}
          accessibilityRole="button"
          onPress={handleRemove}
          style={styles.removeButton}
          testID={`file-remove-${file.localId}`}
        >
          <Text style={styles.removeButtonText}>{uploadText(uploadKeys.remove)}</Text>
        </Pressable>
      </View>

      {isExpanded ? (
        <PrintConfigForm
          detectedPages={detectedPages}
          manualPages={file.manualPages}
          onChange={handleConfigChange}
          onValidChange={handleValidChange}
          value={file.config}
        />
      ) : null}
    </View>
  );
}

export const FilePickerCard = memo(FilePickerCardComponent);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderCurve: 'continuous',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  preview: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderLight,
    borderCurve: 'continuous',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    height: 56,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 56,
  },
  previewImage: {
    height: 56,
    width: 56,
  },
  previewText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  fileInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  fileName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metaText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  pagesBadge: {
    ...typography.caption,
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderLight,
    borderCurve: 'continuous',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    color: colors.textSecondary,
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusColumn: {
    alignItems: 'flex-end',
    minWidth: 74,
  },
  statusText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  statusDone: {
    color: colors.success,
  },
  statusError: {
    color: colors.error,
  },
  manualPagesInput: {
    maxWidth: 180,
  },
  errorRow: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.error,
    borderCurve: 'continuous',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  errorText: {
    ...typography.bodySm,
    color: colors.error,
    flex: 1,
  },
  inlineButton: {
    borderColor: colors.error,
    borderCurve: 'continuous',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inlineButtonText: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.borderLight,
    borderCurve: 'continuous',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  secondaryButtonText: {
    ...typography.bodySm,
    color: colors.primary,
    fontWeight: '700',
  },
  removeButton: {
    alignItems: 'center',
    borderColor: colors.error,
    borderCurve: 'continuous',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  removeButtonText: {
    ...typography.bodySm,
    color: colors.error,
    fontWeight: '700',
  },
});
