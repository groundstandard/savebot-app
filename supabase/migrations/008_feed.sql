-- SaveBot: Migration 008 — opt-in public saves + following feed.
-- A save is private by default; the owner can mark it public to show it on their
-- profile and in followers' feeds. Safe to re-run.

ALTER TABLE public.saved_items ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS saved_items_public_idx
    ON public.saved_items(created_at DESC) WHERE is_public = true;

-- Feed: public, completed saves from people the caller follows (with author info).
-- SECURITY DEFINER so it can read across users, but scoped to the caller's follows
-- and to is_public rows only — never exposes private saves or email.
CREATE OR REPLACE FUNCTION public.get_following_feed(lim int DEFAULT 40)
RETURNS TABLE (
    id uuid,
    user_id uuid,
    author_name text,
    author_avatar text,
    ai_summary text,
    raw_caption text,
    content_classification text,
    category_id uuid,
    source_platform text,
    source_url text,
    created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT s.id, s.user_id, u.display_name, u.avatar_url,
           s.ai_summary, s.raw_caption, s.content_classification,
           s.category_id, s.source_platform, s.source_url, s.created_at
    FROM public.saved_items s
    JOIN public.users u ON u.id = s.user_id
    WHERE s.is_public = true
      AND s.is_archived = false
      AND s.processing_status = 'complete'
      AND s.user_id IN (SELECT following_id FROM public.user_follows WHERE follower_id = auth.uid())
    ORDER BY s.created_at DESC
    LIMIT LEAST(GREATEST(lim, 1), 100);
$$;
GRANT EXECUTE ON FUNCTION public.get_following_feed(int) TO authenticated;
