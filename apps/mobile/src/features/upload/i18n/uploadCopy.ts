export const uploadKeys = {
  configure: 'upload.filePicker.configure',
  collapse: 'upload.filePicker.collapse',
  remove: 'upload.filePicker.remove',
  retry: 'upload.filePicker.retry',
  addFile: 'upload.filePicker.addFile',
  filesCount: 'upload.filePicker.filesCount',
  empty: 'upload.filePicker.empty',
  pickerTitle: 'upload.filePicker.pickerTitle',
  pickDocument: 'upload.filePicker.pickDocument',
  pickImage: 'upload.filePicker.pickImage',
  cancel: 'upload.filePicker.cancel',
  unsupportedTypeTitle: 'upload.filePicker.unsupportedTypeTitle',
  unsupportedTypeBody: 'upload.filePicker.unsupportedTypeBody',
  photoPermissionTitle: 'upload.filePicker.photoPermissionTitle',
  photoPermissionBody: 'upload.filePicker.photoPermissionBody',
  pickerErrorTitle: 'upload.filePicker.pickerErrorTitle',
  pickerErrorBody: 'upload.filePicker.pickerErrorBody',
  uploading: 'upload.filePicker.uploading',
  uploaded: 'upload.filePicker.uploaded',
  pending: 'upload.filePicker.pending',
  error: 'upload.filePicker.error',
  manualPages: 'upload.filePicker.manualPages',
  manualPagesPlaceholder: 'upload.filePicker.manualPagesPlaceholder',
  manualPagesRequired: 'upload.filePicker.manualPagesRequired',
  pages: 'upload.filePicker.pages',
  fileType: 'upload.filePicker.fileType',
} as const;

type UploadKey = typeof uploadKeys[keyof typeof uploadKeys];

const uploadFallbacks: Record<UploadKey, string> = {
  [uploadKeys.configure]: 'Configure',
  [uploadKeys.collapse]: 'Hide config',
  [uploadKeys.remove]: 'Remove',
  [uploadKeys.retry]: 'Retry',
  [uploadKeys.addFile]: 'Add file',
  [uploadKeys.filesCount]: 'Files ({current} / {max})',
  [uploadKeys.empty]: 'Add at least 1 file.',
  [uploadKeys.pickerTitle]: 'Add file',
  [uploadKeys.pickDocument]: 'Pick document',
  [uploadKeys.pickImage]: 'Pick image',
  [uploadKeys.cancel]: 'Cancel',
  [uploadKeys.unsupportedTypeTitle]: 'Unsupported file type',
  [uploadKeys.unsupportedTypeBody]: 'Please choose a PDF, Office document, JPG, or PNG.',
  [uploadKeys.photoPermissionTitle]: 'Photo access needed',
  [uploadKeys.photoPermissionBody]: 'Allow photo access to pick images.',
  [uploadKeys.pickerErrorTitle]: 'Could not open picker',
  [uploadKeys.pickerErrorBody]: 'Please try again.',
  [uploadKeys.uploading]: 'Uploading',
  [uploadKeys.uploaded]: 'Uploaded',
  [uploadKeys.pending]: 'Pending',
  [uploadKeys.error]: 'Upload failed',
  [uploadKeys.manualPages]: 'Pages',
  [uploadKeys.manualPagesPlaceholder]: 'Enter pages',
  [uploadKeys.manualPagesRequired]: 'Page count required',
  [uploadKeys.pages]: '{count} pages',
  [uploadKeys.fileType]: 'FILE',
};

export function uploadText(
  key: UploadKey,
  values?: { count?: number; current?: number; max?: number },
): string {
  let template = uploadFallbacks[key];

  if (values?.count !== undefined) {
    template = template.replace('{count}', String(values.count));
  }

  if (values?.current !== undefined) {
    template = template.replace('{current}', String(values.current));
  }

  if (values?.max !== undefined) {
    template = template.replace('{max}', String(values.max));
  }

  return template;
}
