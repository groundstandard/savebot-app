import { getShareExtensionKey } from 'expo-share-intent';

/**
 * expo-router deep-link interceptor.
 *
 * After a share, iOS/Android open SaveBot with a URL like
 * `savebot://dataUrl=<ShareKey>?nonce=...`. Without intercepting it here,
 * expo-router has no matching route and shows "Unmatched Route — Page could not
 * be found" (Bobby's TestFlight report, 2026-08-06). We detect that URL and send
 * the app to a real route ("/"); the root <ShareIntentHandler> then reads the
 * native share payload and routes on to the library.
 *
 * This is the official expo-share-intent + expo-router pattern.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    if (path.includes(`dataUrl=${getShareExtensionKey()}`)) {
      return '/';
    }
    return path;
  } catch {
    return '/';
  }
}
