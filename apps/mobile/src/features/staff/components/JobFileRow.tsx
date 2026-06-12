import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  File,
  FileText,
  FileType,
  Image as ImageIcon,
  Presentation,
  Sheet,
  type LucideIcon,
} from 'lucide-react-native';
import { ColorMode, Orientation } from '@printslot/shared';
import { Card, KeyValue, MoneyText, Text } from '@/components/ui';
import { spacing, useTheme } from '@/theme';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';
import { localizeDigits } from '@/i18n/format';
import type { OrderFile } from '@printslot/shared';

/** Prototype `MIME_IC`: mime extension → lucide glyph. */
const MIME_ICON: Record<string, LucideIcon> = {
  pdf: FileText,
  docx: FileType,
  doc: FileType,
  pptx: Presentation,
  ppt: Presentation,
  xlsx: Sheet,
  xls: Sheet,
  jpg: ImageIcon,
  jpeg: ImageIcon,
  png: ImageIcon,
};

function iconForFile(file: OrderFile): LucideIcon {
  const name = file.fileName ?? '';
  const ext = name.includes('.') ? name.split('.').pop()?.toLowerCase() : undefined;
  const mimeExt = file.mimeType?.split('/').pop()?.toLowerCase();
  return MIME_ICON[ext ?? ''] ?? MIME_ICON[mimeExt ?? ''] ?? File;
}

export interface JobFileRowProps {
  file: OrderFile;
}

/**
 * Prototype `jobFileRow`: a per-file Card. Header is the file icon + name +
 * subtotal; below are KeyValue rows for color, paper size · orientation,
 * copies · duplex, and the page range (with resolved page count).
 */
export function JobFileRow({ file }: JobFileRowProps) {
  const { tones } = useTheme();
  const { t } = useTranslation();
  const language = useSettingsStore((s) => s.language);
  const infoTone = tones.info;
  const Glyph = iconForFile(file);

  const colorLabel = file.colorMode === ColorMode.COLOR ? t('wizard.color') : t('wizard.bwShort');
  const orientationLabel =
    file.orientation === Orientation.PORTRAIT ? t('wizard.portrait') : t('wizard.landscape');
  const copiesLabel = `${localizeDigits(file.copies, language)}× · ${file.duplex ? t('wizard.duplex') : '—'}`;
  const pagesWord = t('wizard.pages', { n: '' }).trim() || 'pages';
  const rangeLabel = `${file.pageRange ? file.pageRange : '—'} (${localizeDigits(
    file.resolvedPages,
    language,
  )} ${pagesWord})`;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: infoTone.bg }]}>
          <Glyph size={20} color={infoTone.fg} />
        </View>
        <Text variant="body" color="textPrimary" numberOfLines={2} style={styles.fileName}>
          {file.fileName}
        </Text>
        <MoneyText amount={Number(file.subtotalPrice)} variant="body" color="textPrimary" style={styles.price} />
      </View>

      <KeyValue label={`${t('wizard.color')}/${t('wizard.bwShort')}`} value={colorLabel} />
      <KeyValue label={t('shop.pricing')} value={`${file.paperSize} · ${orientationLabel}`} />
      <KeyValue label={`${t('wizard.copies')} / ${t('wizard.duplex')}`} value={copiesLabel} />
      <KeyValue label={t('wizard.pageRange')} value={rangeLabel} last />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 0,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  iconWrap: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: 10,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  fileName: {
    flex: 1,
    fontWeight: '600',
  },
  price: {
    fontWeight: '700',
  },
});
