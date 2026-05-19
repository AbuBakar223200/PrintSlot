import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="shops" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="staff" />
    </Stack>
  );
}
