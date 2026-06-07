import env from '@/config/env';
import { authSession } from '@/features/auth/session/authSession';

/**
 * Standard API response shape from the NestJS backend.
 * Matches ResponseInterceptor and HttpExceptionFilter.
 */
export interface ApiResponse<T> {
  data: T;
  message: string;
  statusCode: number;
}

/**
 * API error shape from HttpExceptionFilter.
 */
export interface ApiError {
  data: null;
  message: string;
  statusCode: number;
}

/**
 * Typed fetch wrapper for the PrintSlot API.
 *
 * - Automatically attaches JWT from auth session
 * - Unwraps the standard { data, message, statusCode } envelope
 * - Throws structured errors on non-2xx responses
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = authSession.getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) ?? {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = `${env.API_URL}${path}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const json = await response.json() as ApiResponse<T> | ApiError;

  if (!response.ok) {
    const error = json as ApiError;
    const apiError = new Error(error.message ?? 'Something went wrong') as Error & {
      statusCode: number;
    };
    apiError.statusCode = error.statusCode;
    throw apiError;
  }

  return (json as ApiResponse<T>).data;
}
