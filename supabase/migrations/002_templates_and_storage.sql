-- SaveBot: Migration 002 — community templates, template ratings, storage buckets
-- Run against your Supabase project via the SQL editor. Safe to re-run (idempotent).

-- ============================================================
-- 1. Community templates (users publish category/subcategory structures)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.community_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category_structure JSONB NOT NULL DEFAULT '{}'::jsonb,
    install_count INT NOT NULL DEFAULT 0,
    rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.community_templates ENABLE ROW LEVEL SECURITY;
-- Anyone signed in can browse published templates...
DROP POLICY IF EXISTS "Templates readable by all" ON public.community_templates;
CREATE POLICY "Templates readable by all" ON public.community_templates
    FOR SELECT USING (true);
-- ...but only the creator can create/edit/delete their own.
DROP POLICY IF EXISTS "Creators manage own templates" ON public.community_templates;
CREATE POLICY "Creators manage own templates" ON public.community_templates
    FOR ALL USING (auth.uid() = creator_user_id) WITH CHECK (auth.uid() = creator_user_id);

-- ============================================================
-- 2. Template ratings (1-5, one per user per template)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.template_ratings (
    template_id UUID NOT NULL REFERENCES public.community_templates(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (template_id, user_id)
);

ALTER TABLE public.template_ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Ratings readable by all" ON public.template_ratings;
CREATE POLICY "Ratings readable by all" ON public.template_ratings
    FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users manage own ratings" ON public.template_ratings;
CREATE POLICY "Users manage own ratings" ON public.template_ratings
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Keep community_templates.rating_avg in sync automatically.
CREATE OR REPLACE FUNCTION public.update_template_rating_avg()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.community_templates ct
    SET rating_avg = (
            SELECT COALESCE(AVG(rating), 0)
            FROM public.template_ratings
            WHERE template_id = ct.id
        ),
        updated_at = NOW()
    WHERE ct.id = COALESCE(NEW.template_id, OLD.template_id);
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_template_rating_avg ON public.template_ratings;
CREATE TRIGGER trg_template_rating_avg
    AFTER INSERT OR UPDATE OR DELETE ON public.template_ratings
    FOR EACH ROW EXECUTE FUNCTION public.update_template_rating_avg();

-- ============================================================
-- 3. Storage buckets: user-media (private), thumbnails (private), avatars (public)
--    Files are stored under a folder named after the user's id, e.g. "<uid>/photo.jpg"
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES
    ('user-media', 'user-media', false),
    ('thumbnails', 'thumbnails', false),
    ('avatars',    'avatars',    true)
ON CONFLICT (id) DO NOTHING;

-- Owner-scoped access for user-media + thumbnails (first path segment must be the user's id).
DROP POLICY IF EXISTS "Owner read private media" ON storage.objects;
CREATE POLICY "Owner read private media" ON storage.objects FOR SELECT
    USING (bucket_id IN ('user-media','thumbnails') AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Owner insert private media" ON storage.objects;
CREATE POLICY "Owner insert private media" ON storage.objects FOR INSERT
    WITH CHECK (bucket_id IN ('user-media','thumbnails') AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Owner update private media" ON storage.objects;
CREATE POLICY "Owner update private media" ON storage.objects FOR UPDATE
    USING (bucket_id IN ('user-media','thumbnails') AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Owner delete private media" ON storage.objects;
CREATE POLICY "Owner delete private media" ON storage.objects FOR DELETE
    USING (bucket_id IN ('user-media','thumbnails') AND (storage.foldername(name))[1] = auth.uid()::text);

-- Avatars: public read, owner write.
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Owner write avatars" ON storage.objects;
CREATE POLICY "Owner write avatars" ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Owner update avatars" ON storage.objects;
CREATE POLICY "Owner update avatars" ON storage.objects FOR UPDATE
    USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Owner delete avatars" ON storage.objects;
CREATE POLICY "Owner delete avatars" ON storage.objects FOR DELETE
    USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
