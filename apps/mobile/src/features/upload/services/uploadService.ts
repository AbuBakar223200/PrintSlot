import type { UploadedFile } from '@printslot/shared';
import env from '@/config/env';
import { authSession } from '@/features/auth/session/authSession';
import type { ApiError, ApiResponse } from '@/services/api';

export const ACCEPTED_UPLOAD_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
] as const;

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export interface UploadFileInput {
  uri: string;
  name: string;
  mimeType: string;
}

type UploadApiError = Error & { statusCode: number };

function createApiError(message: string, statusCode: number): UploadApiError {
  const error = new Error(message) as UploadApiError;
  error.statusCode = statusCode;
  return error;
}

export function isAcceptedUploadMime(mimeType: string): boolean {
  return ACCEPTED_UPLOAD_MIME_TYPES.includes(
    mimeType as (typeof ACCEPTED_UPLOAD_MIME_TYPES)[number],
  );
}

export async function uploadFile(
  uri: string,
  name: string,
  mimeType: string,
): Promise<UploadedFile> {
  const formData = new FormData();

  formData.append('file', {
    uri,
    name,
    type: mimeType,
  } as unknown as Blob);

  const token = authSession.getAccessToken();
  const headers: Record<string, string> = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${env.API_URL}/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const json = await response.json() as ApiResponse<UploadedFile> | ApiError;

  if (!response.ok) {
    const error = json as ApiError;
    throw createApiError(error.message ?? 'Upload failed', error.statusCode);
  }

  return (json as ApiResponse<UploadedFile>).data;
}
