import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import { useLibraryStore } from '../store/library';
import { notifySaveComplete } from '../lib/notifications';

/**
 * Subscribes to the current user's saved_items and fires a local
 * "✓ Saved" notification when an item finishes processing.
 *
 * Foreground only. Requires realtime to be enabled for the saved_items table
 * (Supabase → Database → Replication). True background/closed-app push would
 * need stored Expo push tokens + a server-side send from the Edge Function.
 */
export function useSaveNotifications() {
  const session = useAuthStore((s) => s.session);
  const notified = useRef<Set<string>>(new Set());

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
          const cats = useLibraryStore.getState().categories;
          const catName = cats.find((c) => c.id === row.category_id)?.name ?? null;
          const title = (row.ai_summary || row.raw_caption || 'New save').slice(0, 60);
          notifySaveComplete(title, catName);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id]);
}
