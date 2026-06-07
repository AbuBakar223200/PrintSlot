import { Role } from '../constants/roles';
import type { RegisterInput } from '../types/user.types';

export const REGISTERABLE_ROLES = [
  Role.CUSTOMER,
  Role.STAFF,
  Role.SHOP_OWNER,
] as const;

export const REGISTER_PASSWORD_MIN_LENGTH = 6;
export const REGISTER_NAME_MAX_LENGTH = 100;

export type RegisterableRole = (typeof REGISTERABLE_ROLES)[number];

export interface RegisterInputValidationResult {
  isValid: boolean;
  errors: Partial<Record<keyof RegisterInput, string>>;
}

export function isRegisterableRole(role: Role): role is RegisterableRole {
  return REGISTERABLE_ROLES.includes(role as RegisterableRole);
}

export function validateRegisterInput(
  input: RegisterInput,
): RegisterInputValidationResult {
  const errors: RegisterInputValidationResult['errors'] = {};
  const email = input.email.trim();
  const name = input.name.trim();

  if (!name) {
    errors.name = 'Name is required';
  } else if (name.length > REGISTER_NAME_MAX_LENGTH) {
    errors.name = 'Name too long';
  }

  if (!email) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email address';
  }

  if (!input.password) {
    errors.password = 'Password is required';
  } else if (input.password.length < REGISTER_PASSWORD_MIN_LENGTH) {
    errors.password = `Password must be at least ${REGISTER_PASSWORD_MIN_LENGTH} characters`;
  }

  if (!isRegisterableRole(input.role)) {
    errors.role = 'Role must be CUSTOMER, STAFF, or SHOP_OWNER';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
