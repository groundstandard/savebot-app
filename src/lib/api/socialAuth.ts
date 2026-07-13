import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '../supabase';

WebBrowser.maybeCompleteAuthSession();

type Provider = 'google' | 'apple';

// Deep link the native OAuth browser session returns to (e.g. savebot://auth-callback).
const redirectTo = Linking.createURL('auth-callback');

function paramsFromUrl(url: string): URLSearchParams {
  const frag = url.includes('#') ? url.split('#')[1] : (url.split('?')[1] ?? '');
  return new URLSearchParams(frag);
}

async function applyRedirectParams(params: URLSearchParams): Promise<void> {
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) throw error;
    return;
  }
  const code = params.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
  }
}

/** Web: full-page redirect through the provider. A popup would be nicer, but the
 *  browser's Cross-Origin-Opener-Policy blocks inspecting the popup (can't read
 *  window.closed/location), so the redirect is the reliable path. detectSessionInUrl
 *  (see supabase.ts) picks up the session when the provider redirects back. */
async function oauthRedirectWeb(provider: Provider): Promise<void> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
  // The page navigates away here; the session is applied on return.
}

/** Native: system in-app browser sheet (has its own Cancel). */
async function oauthNative(provider: Provider): Promise<void> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('Could not start sign-in.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') throw { code: 'oauth_cancel' }; // user dismissed the sheet
  await applyRedirectParams(paramsFromUrl(result.url));
}

export async function signInWithGoogle(): Promise<void> {
  if (Platform.OS === 'web') return oauthRedirectWeb('google');
  return oauthNative('google');
}

export async function signInWithApple(): Promise<void> {
  if (Platform.OS === 'ios') {
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
    return;
  }
  if (Platform.OS === 'web') return oauthRedirectWeb('apple');
  return oauthNative('apple');
}

/** True when the user cancelled (closed popup / dismissed sheet / cancelled Apple). */
export function isCancel(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const code = (e as { code?: string }).code;
  return code === 'oauth_cancel' || code === 'ERR_REQUEST_CANCELED';
}
