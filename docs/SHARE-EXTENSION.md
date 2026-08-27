# Share Extension / Share Target (Sprint 3 — Week 5)

**Goal:** SaveBot appears in the iOS/Android share sheet from Instagram, TikTok,
YouTube, etc., receives the shared URL/image, and creates a save.

> ⚠️ This step **requires an EAS build and real-device testing** — it cannot run in
> the managed `expo start` dev server or a simulator's Metro session. Do it on a
> dev/preview build.

## Status: IMPLEMENTED (2026-07-22) — only a fresh EAS build remains

The share flow is wired for **both iOS and Android**:
- `expo-share-intent` (8.0.1) installed + its config plugin in `app.json`
  (iOS activation rules + Android `text/*` / `image/*`). The plugin generates the
  **iOS Share Extension** target and the Android intent at build time.
- `src/components/ShareIntentHandler.tsx` is mounted at the root and turns a shared
  URL/text/image into a save via `createSaveFromShare` → opens the library.
- Web-safe (plugin disabled on web; native module is optional).

**Left to do:** run a **fresh EAS build** (`eas build --profile development`) so the
native extension is generated, then test **Share → SaveBot** on a real device.
The reference notes below document the setup that is now in place.

## Setup in place: `expo-share-intent`

A config plugin that adds the iOS Share Extension target **and** wires the Android
intent, then hands the payload to JS — the least-native-code path for managed Expo.

### 1. Install

```bash
npx expo install expo-share-intent
```

### 2. Configure the plugin (`app.json` → `plugins`)

```json
[
  "expo-share-intent",
  {
    "iosActivationRules": { "NSExtensionActivationSupportsWebURLWithMaxCount": 1,
                            "NSExtensionActivationSupportsImageWithMaxCount": 1,
                            "NSExtensionActivationSupportsText": true },
    "androidIntentFilters": ["text/*", "image/*"]
  }
]
```

(With the plugin managing Android, its `androidIntentFilters` supersede the manual
`android.intentFilters` above — keep one source of truth to avoid duplicate entries.)

### 3. Handle the incoming share (e.g. in `app/_layout.tsx`)

```tsx
import { useShareIntent } from 'expo-share-intent';
import { useEffect } from 'react';
import { useAuthStore } from '../src/store/auth';
import { createSaveFromShare } from '../src/lib/api/saveItem';
import { useLibraryStore } from '../src/store/library';

function ShareIntentHandler() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
  const { session } = useAuthStore();
  const { addItem } = useLibraryStore();

  useEffect(() => {
    if (!hasShareIntent || !session) return;
    (async () => {
      const item = await createSaveFromShare(
        {
          url: shareIntent.webUrl ?? undefined,
          text: shareIntent.text ?? undefined,
          imageUri: shareIntent.files?.[0]?.path ?? undefined,
        },
        session.user.id,
      );
      addItem(item);
      resetShareIntent();
      // TODO: route to a "Saved!" confirmation
    })();
  }, [hasShareIntent, session]);

  return null;
}
```

Mount `<ShareIntentHandler />` inside the root provider tree.

### 4. Build + test on device

```bash
eas build --profile development --platform ios      # and/or android
```

Install the build, open Instagram/TikTok → **Share → SaveBot**. Confirm a pending
item appears and then completes (via the `process-save-item` Edge Function, which
fetches the post details + thumbnail and runs AI extraction).

## Known issue: source app (Instagram) freezes after sharing — FIXED 2026-08-26

Symptom (Bobby): sharing from Instagram into SaveBot left Instagram frozen until
force-closed. Cause: `NSExtensionActivationSupportsWebPageWithMaxCount` in
`iosActivationRules` makes iOS treat the extension as a *web-page* target, which
runs a Safari preprocessing JS step inside the extension. Apps like Instagram
share a URL (not a web page), so that step holds the extension context and leaves
the source app unresponsive. Fix: removed that rule — we keep `WebURL` (URLs),
`Image`, and `Text`, which capture everything SaveBot actually needs. **Requires a
new native EAS build to take effect (not an OTA update).**

## Edge cases to cover (from the sprint checklist)

- No URL and no image → save the raw text only.
- Not signed in → stash the payload, prompt login, then replay it.
- Unsupported content type → friendly "can't save this yet" message.
- Extension has no valid session → the app group must share the Supabase session, or
  the extension defers to the main app to finish the save.
