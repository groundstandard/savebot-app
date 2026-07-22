import { useEffect } from 'react';
import { router } from 'expo-router';
import { useShareIntent } from 'expo-share-intent';
import { useAuthStore } from '../store/auth';
import { useLibraryStore } from '../store/library';
import { createSaveFromShare } from '../lib/api/saveItem';

/**
 * Catches content shared into SaveBot from the iOS/Android share sheet
 * (registered via the expo-share-intent config plugin) and turns it into a save
 * through the same pipeline as the Add screen.
 *
 * Mounted at the root. No-op on web (no share sheet). If a cold-start share is
 * ever missed, wrap the app in <ShareIntentProvider> instead of this hook.
 */
export function ShareIntentHandler() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
  const session = useAuthStore((s) => s.session);
  const addItem = useLibraryStore((s) => s.addItem);

  useEffect(() => {
    if (!hasShareIntent) return;
    if (!session) { router.replace('/(auth)/login'); return; }
    (async () => {
      try {
        const item = await createSaveFromShare(
          {
            url: shareIntent.webUrl ?? undefined,
            text: shareIntent.text ?? undefined,
            imageUri: shareIntent.files?.[0]?.path ?? undefined,
          },
          session.user.id,
        );
        addItem(item);
        router.replace('/(tabs)/library');
      } finally {
        resetShareIntent();
      }
    })();
  }, [hasShareIntent, session?.user?.id]);

  return null;
}
