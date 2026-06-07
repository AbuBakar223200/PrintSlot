import { useMutation } from '@tanstack/react-query';
import {
  uploadFile as uploadFileRequest,
  type UploadFileInput,
} from '../services/uploadService';

export function useUploadFile() {
  const mutation = useMutation({
    mutationFn: (file: UploadFileInput) => (
      uploadFileRequest(file.uri, file.name, file.mimeType)
    ),
  });

  return {
    ...mutation,
    uploadFile: mutation.mutateAsync,
    isUploading: mutation.isPending,
  };
}
