export interface UploadedFile {
  fileUrl: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  detectedPages: number | null;
}
