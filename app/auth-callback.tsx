import { useEffect } from 'react';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../src/lib/supabase';
import { useAuthStore } from '../src/store/auth';
import { LoadingScreen } from '../src/components/LoadingScreen';

/**
 * Handles the OAuth deep-link return (savebot://auth-callback) on native. Reads the
 * tokens from the URL, sets the session (synchronously into the store so the index
 * never flashes the login screen), then routes into the app — sign-in completes on
 * the first try with one continuous loading screen.
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
        const { data } = await supabase.auth.getSession();
        useAuthStore.getState().setSession(data.session);
      } catch {
        useAuthStore.getState().setAuthenticating(false);
      }
      router.replace('/');
    }

    Linking.getInitialURL().then((u) => complete(u));
    const sub = Linking.addEventListener('url', (e) => complete(e.url));
    const timer = setTimeout(() => complete(null), 2000);
    return () => { sub.remove(); clearTimeout(timer); };
  }, []);

  return <LoadingScreen message="Signing you in…" />;
}
