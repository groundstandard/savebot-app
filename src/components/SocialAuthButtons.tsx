import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GoogleIcon } from './GoogleIcon';
import { signInWithGoogle, signInWithApple, isAppleCancel } from '../lib/api/socialAuth';
import { FONT_SIZE, BORDER_RADIUS, SPACING } from '../constants';

interface Props {
  onError?: (msg: string) => void;
  redirectTo?: string;
}

export function SocialAuthButtons({ onError, redirectTo = '/' }: Props) {
  const [busy, setBusy] = useState<'google' | 'apple' | null>(null);

  async function handle(provider: 'google' | 'apple') {
    onError?.('');
    setBusy(provider);
    try {
      if (provider === 'google') await signInWithGoogle();
      else await signInWithApple();
      router.replace(redirectTo as never);
    } catch (e: any) {
      if (!isAppleCancel(e)) onError?.(e?.message ?? 'Sign-in failed.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <View>
      {/* Google — white, brand gray text, 4-color mark */}
      <TouchableOpacity style={styles.google} activeOpacity={0.7} onPress={() => handle('google')} disabled={!!busy}>
        {busy === 'google' ? (
          <ActivityIndicator size="small" color="#3c4043" />
        ) : (
          <>
            <GoogleIcon size={18} />
            <Text style={styles.googleText}>Continue with Google</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Apple — black, white mark */}
      <TouchableOpacity style={styles.apple} activeOpacity={0.85} onPress={() => handle('apple')} disabled={!!busy}>
        {busy === 'apple' ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Ionicons name="logo-apple" size={19} color="#fff" style={styles.appleIcon} />
            <Text style={styles.appleText}>Continue with Apple</Text>
          </>
        )}
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
