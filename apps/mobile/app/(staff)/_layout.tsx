import { Stack } from 'expo-router';

export default function StaffLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="jobs/index" />
      <Stack.Screen name="jobs/[jobId]" />
    </Stack>
  );
}
