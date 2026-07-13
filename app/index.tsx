import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/auth';
import { LoadingScreen } from '../src/components/LoadingScreen';

export default function Index() {
  const { session, loading, user } = useAuthStore();

  if (loading) return <LoadingScreen message="Getting things ready…" />;

  if (!session) return <Redirect href="/(auth)/login" />;
  if (user && !user.onboarding_complete) return <Redirect href="/(onboarding)/interests" />;
  return <Redirect href="/(tabs)/library" />;
}
