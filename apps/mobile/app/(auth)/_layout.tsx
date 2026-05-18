import { Stack } from 'expo-router';
import { colors } from '@/config/theme';

/**
 * Auth group layout — headerless stack for login/register flow.
 * No role guard needed — auth screens are public.
 */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    />
  );
}
