import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/auth';
import { ActivityIndicator, View } from 'react-native';
import { COLORS } from '../src/constants';

export default function Index() {
  const { session, loading, user } = useAuthStore();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/login" />;
  if (user && !user.onboarding_complete) return <Redirect href="/(onboarding)/interests" />;
  return <Redirect href="/(tabs)/library" />;
}
