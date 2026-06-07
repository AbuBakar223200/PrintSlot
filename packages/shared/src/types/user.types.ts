import { Role, Language } from '../constants/roles';

/**
 * User entity — shared between API and mobile.
 * Maps from Prisma User model at the API boundary.
 */
export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: Role;
  shopId: string | null;
  language: Language;
  createdAt: string;
  updatedAt: string;
}

/**
 * UserDevice — stores Expo push token per device.
 * One User can have multiple UserDevices.
 */
export interface UserDevice {
  id: string;
  userId: string;
  token: string;
  deviceId: string;
  updatedAt: string;
}

/**
 * Response from POST /auth/register and POST /auth/login.
 */
export interface AuthResponse {
  user: User;
  accessToken: string;
}

/**
 * Input for POST /auth/register.
 * CUSTOMER, STAFF, and SHOP_OWNER can self-register.
 * PLATFORM_ADMIN is seeded.
 */
export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: Role.CUSTOMER | Role.STAFF | Role.SHOP_OWNER;
}

/**
 * Input for POST /auth/login.
 */
export interface LoginInput {
  email: string;
  password: string;
}
