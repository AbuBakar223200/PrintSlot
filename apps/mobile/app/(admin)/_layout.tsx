import { Role } from '@printslot/shared';
import { RoleProtectedStack } from '@/features/auth/components/RoleProtectedStack';

export default function AdminLayout() {
  return (
    <RoleProtectedStack
      requiredRole={Role.PLATFORM_ADMIN}
      screenOptions={{ headerShown: false }}
    />
  );
}
