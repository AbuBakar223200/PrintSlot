import { Role } from '@printslot/shared';
import { RoleProtectedStack } from '@/features/auth/components/RoleProtectedStack';

export default function CustomerLayout() {
  return (
    <RoleProtectedStack
      requiredRole={Role.CUSTOMER}
      screenOptions={{ headerShown: false }}
    />
  );
}
