import { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import { useLibraryStore } from '../store/library';
import { notifySaveComplete } from '../lib/notifications';
import { registerPushToken, isPushActive } from '../lib/push';
import { identifyUser } from '../lib/analytics';

/**
 * Notifications for "✓ Saved" completions.
 *
 * - Registers this device for remote push (Expo) so a save completes with a
 *   push in any app state — foreground, background, or closed — sent by the
 *   process-save-item Edge Function.
 * - Realtime fallback: if remote push isn't active (simulator, permission
 *   denied, or a build without push credentials), fires a LOCAL notification
 *   on completion. Skipped when push is active to avoid a duplicate banner.
 * - Tapping a "✓ Saved" notification opens the item.
 */
export function useSaveNotifications() {
  const session = useAuthStore((s) => s.session);
  const notified = useRef<Set<string>>(new Set());

  // Register this device for remote push + tie analytics to the user.
  useEffect(() => {
    if (session) {
      registerPushToken(session.user.id);
      identifyUser(session.user.id);
    }
  }, [session?.user?.id]);

  // Tapping a "✓ Saved" notification (local or push) opens the saved item.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const itemId = (resp.notification.request.content.data as { itemId?: string })?.itemId;
      if (itemId) router.push({ pathname: '/item/[id]', params: { id: itemId } });
    });
    return () => sub.remove();
  }, []);

  // Realtime fallback: local notification when remote push isn't active.
  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel('saved-items-complete')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'saved_items', filter: `user_id=eq.${session.user.id}` },
        (payload) => {
          const row = payload.new as {
            id: string; processing_status: string; category_id: string | null;
            ai_summary: string | null; raw_caption: string | null;
          };
          if (row?.processing_status !== 'complete' || notified.current.has(row.id)) return;
          notified.current.add(row.id);
          if (isPushActive()) return; // the server push already covers this save
          const cats = useLibraryStore.getState().categories;
          const catName = cats.find((c) => c.id === row.category_id)?.name ?? null;
          const title = (row.ai_summary || row.raw_caption || 'New save').slice(0, 60);
          notifySaveComplete(title, catName, row.id);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id]);
}
