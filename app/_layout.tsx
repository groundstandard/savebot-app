import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { ShareIntentProvider } from 'expo-share-intent';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuth } from '../src/hooks/useAuth';
import { useSaveNotifications } from '../src/hooks/useSaveNotifications';
import { ShareIntentHandler } from '../src/components/ShareIntentHandler';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { useThemeStore } from '../src/store/theme';
import { useIsDark } from '../src/hooks/useColors';

// Hold the branded native splash (indigo + bookmark) until JS mounts, so it
// hands off seamlessly to the animated LoadingScreen — no default grid flash.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  useAuth(); // Initialize auth listener at root
  useSaveNotifications(); // Local "✓ Saved" notification when processing completes
  const loadTheme = useThemeStore((s) => s.load);
  const isDark = useIsDark();
  useEffect(() => {
    loadTheme();
    // Reveal the JS UI (the animated LoadingScreen picks up the same branding).
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        {/* ShareIntentProvider sits above the app's other providers so it can
            catch a share (incl. cold-start) and feed useShareIntentContext.
            Kept inside the ErrorBoundary so a share-intent failure can't
            white-screen the whole app (Bobby 2026-08-06). */}
        <ShareIntentProvider options={{ resetOnBackground: true }}>
        <SafeAreaProvider>
          {/* Isolated so a share-intent failure can never blank the whole app. */}
          <ErrorBoundary fallback={null}>
            <ShareIntentHandler />
          </ErrorBoundary>
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
        </ShareIntentProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
