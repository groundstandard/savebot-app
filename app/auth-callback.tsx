import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../src/lib/supabase';
import { COLORS } from '../src/constants';

/**
 * Handles the OAuth deep-link return (savebot://auth-callback). On native the
 * provider redirect sometimes opens the app here instead of being caught by the
 * in-app browser — this route reads the tokens from the URL, sets the session,
 * and sends the user in, so sign-in completes on the FIRST try (no more bouncing
 * back to the login screen or hitting an "Unmatched Route").
 */
export default function AuthCallback() {
  useEffect(() => {
    let done = false;

    async function complete(url: string | null) {
      if (done) return;
      done = true;
      try {
        if (url) {
          const frag = url.includes('#') ? url.split('#')[1] : (url.split('?')[1] ?? '');
          const params = new URLSearchParams(frag);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          const code = params.get('code');
          if (access_token && refresh_token) {
            await supabase.auth.setSession({ access_token, refresh_token });
          } else if (code) {
            await supabase.auth.exchangeCodeForSession(code);
          }
        }
      } catch {
        // ignore — index will route to login if no session was established
      }
      router.replace('/');
    }

    Linking.getInitialURL().then((u) => complete(u));
    const sub = Linking.addEventListener('url', (e) => complete(e.url));
    const timer = setTimeout(() => complete(null), 2000); // fallback
    return () => { sub.remove(); clearTimeout(timer); };
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
});
