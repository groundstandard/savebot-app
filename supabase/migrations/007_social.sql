-- SaveBot: Migration 007 — social layer (follows + public profiles).
-- user_follows + community_templates/template_ratings tables already exist;
-- this secures follows and exposes SAFE public-profile reads (no email/PII).
-- Safe to re-run.

-- ============================================================
-- 1. Row-Level Security for user_follows
-- ============================================================
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- The follow graph (who follows whom) is public — needed for counts + lists.
DROP POLICY IF EXISTS "Follows readable" ON public.user_follows;
CREATE POLICY "Follows readable" ON public.user_follows
    FOR SELECT USING (true);

-- A user can only create/remove their OWN follows.
DROP POLICY IF EXISTS "Users create own follows" ON public.user_follows;
CREATE POLICY "Users create own follows" ON public.user_follows
    FOR INSERT WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users delete own follows" ON public.user_follows;
CREATE POLICY "Users delete own follows" ON public.user_follows
    FOR DELETE USING (auth.uid() = follower_id);

CREATE INDEX IF NOT EXISTS user_follows_following_idx ON public.user_follows(following_id);

-- ============================================================
-- 2. Public profile — a single call for safe fields + counts + is_following.
--    SECURITY DEFINER so it can read across users, but it only returns a row
--    when the target is public (or it's you); it never exposes email.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_public_profile(target uuid)
RETURNS TABLE (
    id uuid,
    display_name text,
    avatar_url text,
    is_public boolean,
    followers_count bigint,
    following_count bigint,
    is_following boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT
        u.id, u.display_name, u.avatar_url, u.profile_public,
        (SELECT count(*) FROM public.user_follows f WHERE f.following_id = u.id),
        (SELECT count(*) FROM public.user_follows f WHERE f.follower_id = u.id),
        EXISTS (SELECT 1 FROM public.user_follows f WHERE f.following_id = u.id AND f.follower_id = auth.uid())
    FROM public.users u
    WHERE u.id = target AND (u.profile_public = true OR u.id = auth.uid());
$$;
GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO authenticated;

-- ============================================================
-- 3. Discover public users by display name (safe fields only).
-- ============================================================
CREATE OR REPLACE FUNCTION public.search_public_users(q text, lim int DEFAULT 25)
RETURNS TABLE (id uuid, display_name text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT u.id, u.display_name, u.avatar_url
    FROM public.users u
    WHERE u.profile_public = true
      AND u.id <> auth.uid()
      AND u.display_name ILIKE '%' || q || '%'
    ORDER BY u.display_name
    LIMIT LEAST(GREATEST(lim, 1), 50);
$$;
GRANT EXECUTE ON FUNCTION public.search_public_users(text, int) TO authenticated;
