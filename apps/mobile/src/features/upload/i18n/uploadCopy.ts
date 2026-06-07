export const uploadKeys = {
  configure: 'upload.filePicker.configure',
  collapse: 'upload.filePicker.collapse',
  remove: 'upload.filePicker.remove',
  retry: 'upload.filePicker.retry',
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
  values?: { count?: number },
): string {
  const template = uploadFallbacks[key];

  if (values?.count !== undefined) {
    return template.replace('{count}', String(values.count));
  }

  return template;
}
