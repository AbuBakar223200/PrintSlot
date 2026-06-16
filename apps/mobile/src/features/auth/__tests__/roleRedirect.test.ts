import { Role } from '@printslot/shared';
import {
  getRoleHomePath,
  resolveAuthRedirect,
  resolveProtectedRouteRedirect,
} from '../navigation/roleRedirect';

describe('resolveAuthRedirect', () => {
  it('waits for auth hydration before redirecting', () => {
    expect(resolveAuthRedirect({
      isHydrated: false,
      isAuthenticated: false,
      currentSegments: [],
    })).toBeNull();
  });

  it('does not replace the login route when the user is already in auth', () => {
    expect(resolveAuthRedirect({
      isHydrated: true,
      isAuthenticated: false,
      currentSegments: ['(auth)', 'login'],
    })).toBeNull();
  });

  it('does not replace owner profile when the owner is already inside the owner group', () => {
    expect(resolveAuthRedirect({
      isHydrated: true,
      isAuthenticated: true,
      role: Role.SHOP_OWNER,
      currentSegments: ['(owner)', 'profile'],
    })).toBeNull();
  });

  it('sends an owner outside the owner group to the owner shop', () => {
    expect(resolveAuthRedirect({
      isHydrated: true,
      isAuthenticated: true,
      role: Role.SHOP_OWNER,
      currentSegments: ['(auth)', 'login'],
    })).toBe('/(owner)/shop');
  });

  it('keeps authenticated users inside their own route group', () => {
    expect(resolveAuthRedirect({
      isHydrated: true,
      isAuthenticated: true,
      role: Role.STAFF,
      currentSegments: ['(staff)', 'jobs'],
    })).toBeNull();
  });

  it('does not repeatedly replace when Expo reports only a leaf segment after redirect', () => {
    expect(resolveAuthRedirect({
      isHydrated: true,
      isAuthenticated: true,
      role: Role.SHOP_OWNER,
      currentSegments: ['profile'],
    })).toBeNull();
  });

  it('waits instead of replacing while Expo has not reported route segments yet', () => {
    expect(resolveAuthRedirect({
      isHydrated: true,
      isAuthenticated: true,
      role: Role.SHOP_OWNER,
      currentSegments: [],
    })).toBeNull();
  });
});

describe('getRoleHomePath', () => {
  it('returns the owner shop route for shop owners', () => {
    expect(getRoleHomePath(Role.SHOP_OWNER)).toBe('/(owner)/shop');
  });

  it('returns null for unknown roles', () => {
    expect(getRoleHomePath('UNKNOWN')).toBeNull();
  });
});

describe('resolveProtectedRouteRedirect', () => {
  it('waits during hydration so protected screens do not mount with empty auth state', () => {
    expect(resolveProtectedRouteRedirect({
      isHydrated: false,
      isAuthenticated: false,
      requiredRole: Role.SHOP_OWNER,
    })).toBeNull();
  });

  it('redirects unauthenticated protected-route access to login', () => {
    expect(resolveProtectedRouteRedirect({
      isHydrated: true,
      isAuthenticated: false,
      requiredRole: Role.SHOP_OWNER,
    })).toBe('/(auth)/login');
  });

  it('allows the matching role through', () => {
    expect(resolveProtectedRouteRedirect({
      isHydrated: true,
      isAuthenticated: true,
      role: Role.SHOP_OWNER,
      requiredRole: Role.SHOP_OWNER,
    })).toBeNull();
  });

  it('redirects a signed-in user with the wrong role to their own home', () => {
    expect(resolveProtectedRouteRedirect({
      isHydrated: true,
      isAuthenticated: true,
      role: Role.CUSTOMER,
      requiredRole: Role.SHOP_OWNER,
    })).toBe('/(customer)/');
  });
});
