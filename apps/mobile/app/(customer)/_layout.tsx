import { Stack } from 'expo-router';

export default function CustomerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="orders/index" />
      <Stack.Screen name="orders/new" />
      <Stack.Screen name="orders/[orderId]" />
      <Stack.Screen name="shops/index" />
      <Stack.Screen name="shops/[shopId]" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="wallet" />
    </Stack>
  );
}
