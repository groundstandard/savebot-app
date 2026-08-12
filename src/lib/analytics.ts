import { PostHog } from 'posthog-react-native';

// Product analytics (PostHog), opt-in via env. With no key set, every call is a
// safe no-op, so the app ships fine before Bobby provisions PostHog and starts
// sending data the moment the key lands (EXPO_PUBLIC_* are inlined at build time).
//
// NOTE: crash reporting (Sentry) was removed for now. Root cause of the failed
// Android release build was the Sentry Gradle "SentryUpload" task (source-map
// upload) failing because no org/project/auth token was configured — it errored
// instead of skipping. To re-add Sentry: reinstall @sentry/react-native, and set
// SENTRY_DISABLE_AUTO_UPLOAD=true (EAS env) so the upload step is skipped — do it
// in the same rebuild that adds Bobby's EXPO_PUBLIC_SENTRY_DSN (Sentry is a no-op
// without a DSN anyway). captureError() stays as a stable no-op hook meanwhile.
const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '';
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

let posthog: PostHog | null = null;
let started = false;

/** Start product analytics. No-op without a key. */
export function initMonitoring(): void {
  if (started) return;
  started = true;
  if (POSTHOG_KEY) {
    try { posthog = new PostHog(POSTHOG_KEY, { host: POSTHOG_HOST }); } catch { posthog = null; }
  }
}

/** Tie events to the signed-in user. */
export function identifyUser(userId: string): void {
  try { posthog?.identify(userId); } catch { /* ignore */ }
}

/** Clear identity on sign-out. */
export function resetUser(): void {
  try { posthog?.reset(); } catch { /* ignore */ }
}

/** Record a product-analytics event. */
export function track(event: string, props?: Record<string, unknown>): void {
  try { posthog?.capture(event, props); } catch { /* ignore */ }
}

/** Stable hook for handled errors (crash SDK to be re-added later). */
export function captureError(e: unknown): void {
  if (__DEV__) console.error('[captureError]', e);
}
