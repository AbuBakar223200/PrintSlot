import React, { useCallback } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { Button, ButtonText, Text } from '@/components/ui';
import { radii, spacing, useThemeTokens } from '@/theme';
import { FilePickerCard } from './FilePickerCard';
import {
  ACCEPTED_UPLOAD_MIME_TYPES,
  isAcceptedUploadMime,
} from '../services/uploadService';
import { useUploadFile } from '../hooks/useFileUpload';
import { uploadKeys, uploadText } from '../i18n/uploadCopy';
import {
  defaultPrintConfig,
  type PickedUploadFile,
  type WizardFile,
} from '../types';

export interface FilePickerSectionProps {
  files: WizardFile[];
  onAdd: (file: WizardFile) => void;
  onChange: (localId: string, patch: Partial<WizardFile>) => void;
  onRemove: (localId: string) => void;
  maxFiles?: number;
}

function createLocalId(): string {
  return `file-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeMimeType(mimeType: string | null | undefined, name: string): string {
  if (mimeType) {
    return mimeType;
  }

  const lowerName = name.toLowerCase();

  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
    return 'image/jpeg';
  }

  if (lowerName.endsWith('.png')) {
    return 'image/png';
  }

  if (lowerName.endsWith('.pdf')) {
    return 'application/pdf';
  }

  return 'application/octet-stream';
}

function imageName(asset: ImagePicker.ImagePickerAsset): string {
  if (asset.fileName) {
    return asset.fileName;
  }

  const uriName = asset.uri.split('/').pop();

  if (uriName) {
    return uriName;
  }

  return `image-${Date.now().toString(36)}.jpg`;
}

function createWizardFile(localFile: PickedUploadFile): WizardFile {
  const isPdf = localFile.mimeType === 'application/pdf';

  return {
    localId: createLocalId(),
    localFile,
    upload: null,
    uploadStatus: 'uploading',
    manualPages: null,
    config: defaultPrintConfig,
    configValid: isPdf,
    configError: isPdf ? undefined : uploadText(uploadKeys.manualPagesRequired),
  };
}

export function FilePickerSection({
  files,
  onAdd,
  onChange,
  onRemove,
  maxFiles = 10,
}: FilePickerSectionProps) {
  const tokens = useThemeTokens();
  const { uploadFile } = useUploadFile();
  const isAtMax = files.length >= maxFiles;

  const uploadPickedFile = useCallback(async (file: WizardFile) => {
    try {
      const upload = await uploadFile(file.localFile);

      onChange(file.localId, {
        upload,
        uploadStatus: 'done',
        uploadError: undefined,
        configValid: upload.detectedPages !== null || file.manualPages !== null,
        configError: upload.detectedPages !== null || file.manualPages !== null
          ? undefined
          : uploadText(uploadKeys.manualPagesRequired),
      });
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : uploadText(uploadKeys.error);

      onChange(file.localId, {
        uploadStatus: 'error',
        uploadError: message,
      });
    }
  }, [onChange, uploadFile]);

  const addPickedFile = useCallback((localFile: PickedUploadFile) => {
    if (!isAcceptedUploadMime(localFile.mimeType)) {
      Alert.alert(
        uploadText(uploadKeys.unsupportedTypeTitle),
        uploadText(uploadKeys.unsupportedTypeBody),
      );
      return;
    }

    const file = createWizardFile(localFile);
    onAdd(file);
    void uploadPickedFile(file);
  }, [onAdd, uploadPickedFile]);

  const pickDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: [...ACCEPTED_UPLOAD_MIME_TYPES],
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];

      addPickedFile({
        uri: asset.uri,
        name: asset.name,
        mimeType: normalizeMimeType(asset.mimeType, asset.name),
        size: asset.size ?? null,
      });
    } catch {
      Alert.alert(
        uploadText(uploadKeys.pickerErrorTitle),
        uploadText(uploadKeys.pickerErrorBody),
      );
    }
  }, [addPickedFile]);

  const pickImage = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          uploadText(uploadKeys.photoPermissionTitle),
          uploadText(uploadKeys.photoPermissionBody),
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      const name = imageName(asset);

      addPickedFile({
        uri: asset.uri,
        name,
        mimeType: normalizeMimeType(asset.mimeType, name),
        size: asset.fileSize ?? null,
      });
    } catch {
      Alert.alert(
        uploadText(uploadKeys.pickerErrorTitle),
        uploadText(uploadKeys.pickerErrorBody),
      );
    }
  }, [addPickedFile]);

  const openPickerMenu = useCallback(() => {
    if (isAtMax) {
      return;
    }

    Alert.alert(
      uploadText(uploadKeys.pickerTitle),
      undefined,
      [
        { text: uploadText(uploadKeys.pickDocument), onPress: () => { void pickDocument(); } },
        { text: uploadText(uploadKeys.pickImage), onPress: () => { void pickImage(); } },
        { text: uploadText(uploadKeys.cancel), style: 'cancel' },
      ],
    );
  }, [isAtMax, pickDocument, pickImage]);

  const handleRetry = useCallback((localId: string) => {
    const file = files.find((item) => item.localId === localId);

    if (!file) {
      return;
    }

    onChange(localId, {
      uploadStatus: 'uploading',
      uploadError: undefined,
    });
    void uploadPickedFile(file);
  }, [files, onChange, uploadPickedFile]);

  const renderItem = useCallback<ListRenderItem<WizardFile>>(({ item }) => (
    <FilePickerCard
      file={item}
      onChange={onChange}
      onRemove={onRemove}
      onRetry={handleRetry}
    />
  ), [handleRetry, onChange, onRemove]);

  const keyExtractor = useCallback((item: WizardFile) => item.localId, []);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text variant="h3" color="textPrimary" style={styles.title}>
          {uploadText(uploadKeys.filesCount, { current: files.length, max: maxFiles })}
        </Text>
        <Button
          size="sm"
          disabled={isAtMax}
          onPress={openPickerMenu}
          accessibilityLabel={uploadText(uploadKeys.addFile)}
          testID="file-picker-add"
        >
          <ButtonText>{uploadText(uploadKeys.addFile)}</ButtonText>
        </Button>
      </View>

      <FlashList
        contentContainerStyle={styles.listContent}
        data={files}
        estimatedItemSize={280}
        keyExtractor={keyExtractor}
        ListEmptyComponent={
          <View
            style={[
              styles.emptyBox,
              { backgroundColor: tokens.surface, borderColor: tokens.border },
            ]}
          >
            <Text variant="bodySm" color="textSecondary">
              {uploadText(uploadKeys.empty)}
            </Text>
          </View>
        }
        renderItem={renderItem}
        scrollEnabled={false}
        style={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
  },
  list: {
    minHeight: 72,
  },
  listContent: {
    paddingBottom: spacing.xs,
  },
  emptyBox: {
    borderCurve: 'continuous',
    borderRadius: radii.card,
    borderWidth: 1,
    padding: spacing.lg,
  },
});
