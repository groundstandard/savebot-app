-- SaveBot: Migration 004 — Row-Level Security for shared_items
-- Secures the share-tracking table so each user can only create and read their
-- own share records. Safe to re-run (idempotent). Run via the Supabase SQL editor.

ALTER TABLE public.shared_items ENABLE ROW LEVEL SECURITY;

-- A user can record a share only for themselves.
DROP POLICY IF EXISTS "Users create own shares" ON public.shared_items;
CREATE POLICY "Users create own shares" ON public.shared_items
    FOR INSERT WITH CHECK (auth.uid() = shared_by_user_id);

-- A user can read their own share history.
DROP POLICY IF EXISTS "Users read own shares" ON public.shared_items;
CREATE POLICY "Users read own shares" ON public.shared_items
    FOR SELECT USING (auth.uid() = shared_by_user_id);

-- A user can remove their own share records.
DROP POLICY IF EXISTS "Users delete own shares" ON public.shared_items;
CREATE POLICY "Users delete own shares" ON public.shared_items
    FOR DELETE USING (auth.uid() = shared_by_user_id);

-- NOTE: token-based public read (for a future shareable web link) is intentionally
-- NOT added here. When the web preview is built, expose it via a SECURITY DEFINER
-- RPC that looks up a single row by share_token, rather than a blanket public SELECT.
