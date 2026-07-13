import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../src/hooks/useAuth';

export default function RootLayout() {
  useAuth(); // Initialize auth listener at root

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="item/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="cook-mode/[id]" options={{ presentation: 'fullScreenModal' }} />
      </Stack>
    </>
  );
}
