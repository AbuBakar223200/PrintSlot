import { Role } from '@printslot/shared';
import { RoleProtectedStack } from '@/features/auth/components/RoleProtectedStack';

/**
 * (owner) route group — minimal scaffold added in Slice 03 to host
 * the Profile route. Slice 30 (owner-route-group-mobile) layers
 * shop/, slots/, jobs/, analytics/ routes on top.
 */
export default function OwnerLayout() {
  return (
    <RoleProtectedStack
      requiredRole={Role.SHOP_OWNER}
      screenOptions={{ headerShown: false }}
    />
  );
}
