import { apiFetch } from '@/services/api';
import type { AuthResponse, User, RegisterInput, LoginInput } from '@printslot/shared';

/**
 * Auth API wrappers — typed fetch calls to NestJS auth endpoints.
 * Called by TanStack Query hooks in useAuth.ts.
 */
export const authApi = {
  /**
   * POST /auth/register
   * Only CUSTOMER and SHOP_OWNER can self-register.
   */
  register: (input: RegisterInput): Promise<AuthResponse> =>
    apiFetch<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  /**
   * POST /auth/login
   */
  login: (input: LoginInput): Promise<AuthResponse> =>
    apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  /**
   * GET /auth/me
   * Returns the current authenticated user.
   */
  getMe: (): Promise<User> =>
    apiFetch<User>('/auth/me'),
};
