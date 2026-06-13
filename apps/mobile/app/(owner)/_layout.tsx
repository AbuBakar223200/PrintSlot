import { Role } from '@printslot/shared';
import { RoleProtectedStack } from '@/features/auth/components/RoleProtectedStack';

/**
 * (owner) route group — role-guarded stack hosting the Shop Owner screens:
 * shop, jobs, slots, staff, analytics (+ profile), with the floating OwnerTabBar.
 */
export default function OwnerLayout() {
  return (
    <RoleProtectedStack
      requiredRole={Role.SHOP_OWNER}
      screenOptions={{ headerShown: false }}
    />
  );
}
