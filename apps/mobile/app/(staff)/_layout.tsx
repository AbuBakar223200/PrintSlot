import { Role } from '@printslot/shared';
import { RoleProtectedStack } from '@/features/auth/components/RoleProtectedStack';

export default function StaffLayout() {
  return (
    <RoleProtectedStack
      requiredRole={Role.STAFF}
      screenOptions={{ headerShown: false }}
    />
  );
}
