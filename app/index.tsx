import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/auth';
import { LoadingScreen } from '../src/components/LoadingScreen';

export default function Index() {
  const { session, loading, user, authenticating } = useAuthStore();

  // Session wins: once signed in, go straight in (never blocked by the loading flag).
  if (session) {
    if (user && !user.onboarding_complete) return <Redirect href="/(onboarding)/interests" />;
    return <Redirect href="/(tabs)/library" />;
  }
  // No session yet — show the loading screen while auth is in flight, else the login.
  if (loading || authenticating) return <LoadingScreen message="Getting things ready…" />;
  return <Redirect href="/(auth)/login" />;
}
