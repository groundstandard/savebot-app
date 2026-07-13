import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '../supabase';

WebBrowser.maybeCompleteAuthSession();

type Provider = 'google' | 'apple';

// Deep link the OAuth browser session returns to (e.g. savebot://auth-callback).
const redirectTo = Linking.createURL('auth-callback');

function paramsFromUrl(url: string): URLSearchParams {
  const frag = url.includes('#') ? url.split('#')[1] : (url.split('?')[1] ?? '');
  return new URLSearchParams(frag);
}

/** Browser-based OAuth (used on web/Android, and Apple fallback off iOS). */
async function oauthSignIn(provider: Provider): Promise<void> {
  if (Platform.OS === 'web') {
    // Web does a full-page redirect and returns to the app automatically.
    const { error } = await supabase.auth.signInWithOAuth({ provider });
    if (error) throw error;
    return;
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('Could not start sign-in.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return; // user cancelled

  const params = paramsFromUrl(result.url);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (access_token && refresh_token) {
    const { error: sErr } = await supabase.auth.setSession({ access_token, refresh_token });
    if (sErr) throw sErr;
    return;
  }
  const code = params.get('code');
  if (code) {
    const { error: cErr } = await supabase.auth.exchangeCodeForSession(code);
    if (cErr) throw cErr;
  }
}

export async function signInWithGoogle(): Promise<void> {
  await oauthSignIn('google');
}

export async function signInWithApple(): Promise<void> {
  // Native Apple button on iOS; OAuth fallback elsewhere.
  if (Platform.OS !== 'ios') {
    await oauthSignIn('apple');
    return;
  }
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  if (!credential.identityToken) throw new Error('No identity token from Apple.');
  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });
  if (error) throw error;
}

export function isAppleCancel(e: unknown): boolean {
  return !!e && typeof e === 'object' && (e as { code?: string }).code === 'ERR_REQUEST_CANCELED';
}
