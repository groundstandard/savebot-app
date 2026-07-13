import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GoogleIcon } from './GoogleIcon';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import { signInWithGoogle, signInWithApple, isCancel } from '../lib/api/socialAuth';
import { FONT_SIZE, BORDER_RADIUS, SPACING } from '../constants';

interface Props {
  onError?: (msg: string) => void;
  redirectTo?: string;
}

export function SocialAuthButtons({ onError, redirectTo = '/' }: Props) {
  async function handle(provider: 'google' | 'apple') {
    onError?.('');
    // Flip on the global loading screen immediately so the login form is never
    // visible again during the OAuth round-trip (no flashing back to login).
    useAuthStore.getState().setAuthenticating(true);
    try {
      if (provider === 'google') await signInWithGoogle();
      else await signInWithApple();
    } catch (e: any) {
      if (!isCancel(e)) {
        useAuthStore.getState().setAuthenticating(false);
        onError?.(e?.message ?? 'Sign-in failed.');
        return;
      }
      // A "cancel" on Android can actually be the deep-link succeeding — fall
      // through and wait for the session before deciding it was a real cancel.
    }
    // Wait for the session to land (WebBrowser parse OR the auth-callback route).
    for (let i = 0; i < 24; i++) {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        useAuthStore.getState().setSession(data.session);
        router.replace(redirectTo as never);
        return;
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    useAuthStore.getState().setAuthenticating(false); // genuine cancel / no session
  }

  return (
    <View>
      <TouchableOpacity style={styles.google} activeOpacity={0.7} onPress={() => handle('google')}>
        <GoogleIcon size={18} />
        <Text style={styles.googleText}>Continue with Google</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.apple} activeOpacity={0.85} onPress={() => handle('apple')}>
        <Ionicons name="logo-apple" size={19} color="#fff" style={styles.appleIcon} />
        <Text style={styles.appleText}>Continue with Apple</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  google: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    height: 52, backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: '#DADCE0',
    marginBottom: SPACING.md,
  },
  googleText: { color: '#3c4043', fontSize: 15, fontWeight: '500' },
  apple: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 52, backgroundColor: '#000',
    borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.lg,
  },
  appleIcon: { marginTop: -2 },
  appleText: { color: '#fff', fontSize: FONT_SIZE.md, fontWeight: '600' },
});
