import {
  ColorMode,
  Orientation,
  PaperSize,
  type PrintConfig,
  type UploadedFile,
} from '@printslot/shared';

export type UploadStatus = 'pending' | 'uploading' | 'done' | 'error';

export interface PickedUploadFile {
  uri: string;
  name: string;
  mimeType: string;
  size: number | null;
}

export interface WizardFile {
  localId: string;
  localFile: PickedUploadFile;
  upload: UploadedFile | null;
  uploadStatus: UploadStatus;
  uploadError?: string;
  manualPages: number | null;
  config: PrintConfig;
  configValid?: boolean;
  configError?: string;
}

export const defaultPrintConfig: PrintConfig = {
  colorMode: ColorMode.COLOR,
  paperSize: PaperSize.A4,
  orientation: Orientation.PORTRAIT,
  copies: 1,
  duplex: false,
  pageRange: null,
};
