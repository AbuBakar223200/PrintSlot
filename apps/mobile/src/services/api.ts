import env from '@/config/env';

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

/** Token getter — set by useAuthStore after login */
let getAccessToken: (() => string | null) | null = null;

/**
 * Register the token getter function.
 * Called once from useAuthStore initialization.
 */
export function setTokenGetter(getter: () => string | null): void {
  getAccessToken = getter;
}

/**
 * Typed fetch wrapper for the PrintSlot API.
 *
 * - Automatically attaches JWT from auth store
 * - Unwraps the standard { data, message, statusCode } envelope
 * - Throws structured errors on non-2xx responses
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken?.();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) ?? {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
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
