import type { Role } from '@printslot/shared';

export type RouteGroup = '(auth)' | '(customer)' | '(staff)' | '(owner)' | '(admin)';
export type AuthRedirectPath =
  | '/(auth)/login'
  | '/(customer)/'
  | '/(staff)/jobs/'
  | '/(owner)/profile'
  | '/(admin)/shops/';

interface AuthRedirectInput {
  isHydrated: boolean;
  isAuthenticated: boolean;
  role?: Role | string | null;
  currentSegments?: readonly string[];
}

interface ProtectedRouteInput {
  isHydrated: boolean;
  isAuthenticated: boolean;
  role?: Role | string | null;
  requiredRole: Role;
}

const ROLE_HOME: Record<Role, { group: RouteGroup; path: AuthRedirectPath }> = {
  CUSTOMER: { group: '(customer)', path: '/(customer)/' },
  STAFF: { group: '(staff)', path: '/(staff)/jobs/' },
  SHOP_OWNER: { group: '(owner)', path: '/(owner)/profile' },
  PLATFORM_ADMIN: { group: '(admin)', path: '/(admin)/shops/' },
};

const ROUTE_GROUPS = new Set<string>(['(auth)', '(customer)', '(staff)', '(owner)', '(admin)']);

export function getRoleHomePath(role?: Role | string | null): AuthRedirectPath | null {
  return ROLE_HOME[role as Role]?.path ?? null;
}

export function resolveProtectedRouteRedirect({
  isHydrated,
  isAuthenticated,
  role,
  requiredRole,
}: ProtectedRouteInput): AuthRedirectPath | null {
  if (!isHydrated) return null;
  if (!isAuthenticated) return '/(auth)/login';
  if (role === requiredRole) return null;

  return getRoleHomePath(role) ?? '/(auth)/login';
}

export function resolveAuthRedirect({
  isHydrated,
  isAuthenticated,
  role,
  currentSegments = [],
}: AuthRedirectInput): AuthRedirectPath | null {
  if (!isHydrated) return null;
  if (currentSegments.length === 0) return null;

  const currentGroup = currentSegments.find((segment) => ROUTE_GROUPS.has(segment));

  if (!isAuthenticated) {
    return currentGroup === '(auth)' ? null : '/(auth)/login';
  }

  const target = ROLE_HOME[role as Role];
  if (!target) {
    return currentGroup === '(auth)' ? null : '/(auth)/login';
  }

  if (!currentGroup && currentSegments.length > 0) {
    return null;
  }

  return currentGroup === target.group ? null : target.path;
}
