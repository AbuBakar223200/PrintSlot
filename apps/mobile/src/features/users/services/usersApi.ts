import { apiFetch } from '@/services/api';
import type { User, UserDevice } from '@printslot/shared';
import type { UpdateProfileInput } from '../dto/updateProfile.dto';

/**
 * Input for registering a device push token.
 */
export interface RegisterDeviceInput {
  token: string;
  deviceId: string;
}

/**
 * Users API wrappers — typed fetch calls to the NestJS users endpoints.
 * Called by TanStack Query hooks (useProfile, useDeviceRegistration).
 */
export const usersApi = {
  /**
   * PATCH /users/me
   * Updates the authenticated user's profile.
   */
  updateProfile: (input: UpdateProfileInput): Promise<User> =>
    apiFetch<User>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  /**
   * PATCH /users/me/device
   * Upserts a UserDevice row keyed on (userId, deviceId).
   */
  registerDevice: (input: RegisterDeviceInput): Promise<UserDevice> =>
    apiFetch<UserDevice>('/users/me/device', {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  /**
   * DELETE /users/me/device/:deviceId
   * Best-effort removal of a UserDevice row on logout.
   */
  unregisterDevice: (deviceId: string): Promise<{ success: true }> =>
    apiFetch<{ success: true }>(`/users/me/device/${encodeURIComponent(deviceId)}`, {
      method: 'DELETE',
    }),
};
