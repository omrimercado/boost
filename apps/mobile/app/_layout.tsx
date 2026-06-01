import '../global.css';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useAuthStore } from '@/src/stores/useAuthStore';

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);

  // Always runs on app start regardless of which route is active (deep links included)
  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="trainer" />
      <Stack.Screen name="trainee" />
    </Stack>
  );
}
