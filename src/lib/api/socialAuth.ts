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

/** Web: run OAuth in a centered popup window so the login page stays put.
 *  Closing the popup = cancel (throws { code: 'oauth_cancel' }). */
async function oauthPopupWeb(provider: Provider): Promise<void> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { skipBrowserRedirect: true, redirectTo: window.location.origin },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('Could not start sign-in.');

  const w = 480, h = 640;
  const left = window.screenX + Math.max(0, (window.outerWidth - w) / 2);
  const top = window.screenY + Math.max(0, (window.outerHeight - h) / 2);
  const popup = window.open(data.url, 'savebot-oauth', `width=${w},height=${h},left=${left},top=${top}`);
  if (!popup) throw new Error('Popup was blocked — please allow popups and try again.');

  return new Promise<void>((resolve, reject) => {
    const timer = setInterval(async () => {
      // User closed the popup → treat as cancel (fall back to a shared session if any).
      if (popup.closed) {
        clearInterval(timer);
        const { data: { session } } = await supabase.auth.getSession();
        if (session) resolve();
        else reject({ code: 'oauth_cancel' });
        return;
      }
      let href = '';
      try { href = popup.location.href; } catch { return; } // still on provider (cross-origin)
      if (!href || !href.startsWith(window.location.origin)) return;

      clearInterval(timer);
      try {
        const raw = (popup.location.hash || popup.location.search || '').replace(/^[#?]/, '');
        await applyRedirectParams(new URLSearchParams(raw));
        // If the popup's own app already consumed the tokens, the session is in
        // shared storage — pick it up so the main window is signed in either way.
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No session returned.');
        resolve();
      } catch (e) {
        reject(e);
      } finally {
        try { popup.close(); } catch { /* ignore */ }
      }
    }, 250);
  });
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
  if (Platform.OS === 'web') return oauthPopupWeb('google');
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
  if (Platform.OS === 'web') return oauthPopupWeb('apple');
  return oauthNative('apple');
}

/** True when the user cancelled (closed popup / dismissed sheet / cancelled Apple). */
export function isCancel(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const code = (e as { code?: string }).code;
  return code === 'oauth_cancel' || code === 'ERR_REQUEST_CANCELED';
}
