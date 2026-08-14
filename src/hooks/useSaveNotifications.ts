import { useCallback, useEffect, useRef } from 'react';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import { useLibraryStore } from '../store/library';
import { notifySaveComplete } from '../lib/notifications';
import { registerPushToken, isPushActive } from '../lib/push';
import { identifyUser } from '../lib/analytics';

// The last notification we've already opened. getLastNotificationResponseAsync
// keeps returning the launch notification on every cold start, so without this
// we'd re-open the same item each time the app is opened normally afterwards.
const LAST_OPENED_KEY = 'savebot:last_notif_opened';

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
  const opened = useRef<Set<string>>(new Set());

  // Open the item a "✓ Saved" notification points at. Deduped so the same tap
  // can't navigate twice (warm listener + cold-start check can both fire for
  // one launch) and so a normal relaunch doesn't reopen the last item.
  const openFromNotification = useCallback(async (resp: Notifications.NotificationResponse | null) => {
    if (!resp) return;
    const req = resp.notification.request;
    const itemId = (req.content.data as { itemId?: string })?.itemId;
    if (!itemId) return;
    const key = req.identifier || itemId;
    if (opened.current.has(key)) return; // claim synchronously to close the race
    opened.current.add(key);
    if (key === (await AsyncStorage.getItem(LAST_OPENED_KEY))) return; // opened on a previous launch
    AsyncStorage.setItem(LAST_OPENED_KEY, key);
    router.push({ pathname: '/item/[id]', params: { id: itemId } });
  }, []);

  // Register this device for remote push + tie analytics to the user.
  useEffect(() => {
    if (session) {
      registerPushToken(session.user.id);
      identifyUser(session.user.id);
    }
  }, [session?.user?.id]);

  // Warm tap: app is foreground or backgrounded when the notification is tapped.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      openFromNotification(resp);
    });
    return () => sub.remove();
  }, [openFromNotification]);

  // Cold start: app was closed and launched by tapping the notification. Wait
  // for the session to be restored first so the auth guard doesn't bounce us
  // off the item page before it can render.
  useEffect(() => {
    if (!session) return;
    Notifications.getLastNotificationResponseAsync().then(openFromNotification);
  }, [session?.user?.id, openFromNotification]);

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
