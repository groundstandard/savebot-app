import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth } from '../src/hooks/useAuth';
import { useSaveNotifications } from '../src/hooks/useSaveNotifications';
import { ShareIntentHandler } from '../src/components/ShareIntentHandler';
import { useThemeStore } from '../src/store/theme';
import { useIsDark } from '../src/hooks/useColors';

export default function RootLayout() {
  useAuth(); // Initialize auth listener at root
  useSaveNotifications(); // Local "✓ Saved" notification when processing completes
  const loadTheme = useThemeStore((s) => s.load);
  const isDark = useIsDark();
  useEffect(() => { loadTheme(); }, []);

  return (
    <SafeAreaProvider>
      <ShareIntentHandler />
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        {/* Auth-flow screens swap instantly (no slide) so the loading→app
            transition doesn't flicker the login screen. */}
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="(auth)" options={{ animation: 'none' }} />
        <Stack.Screen name="(onboarding)" options={{ animation: 'none' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
        <Stack.Screen name="auth-callback" options={{ animation: 'none' }} />
        <Stack.Screen name="item/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="cook-mode/[id]" options={{ presentation: 'fullScreenModal' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
