-- SaveBot: Initial Schema
-- Run against your Supabase project via the SQL editor or Supabase CLI

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Users (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
    onboarding_preferences JSONB,
    subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro')),
    subscription_expires_at TIMESTAMPTZ,
    profile_public BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read/write own row" ON public.users
    USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Auto-create user row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, display_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'display_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Categories
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT '📌',
    sort_order INT NOT NULL DEFAULT 0,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own categories" ON public.categories
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Subcategories
CREATE TABLE IF NOT EXISTS public.subcategories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own subcategories" ON public.subcategories
    USING (EXISTS (SELECT 1 FROM public.categories c WHERE c.id = category_id AND c.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.categories c WHERE c.id = category_id AND c.user_id = auth.uid()));

-- Saved items
CREATE TABLE IF NOT EXISTS public.saved_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    source_platform TEXT NOT NULL DEFAULT 'manual' CHECK (source_platform IN ('instagram','tiktok','facebook','x','youtube','manual')),
    source_url TEXT,
    source_creator_handle TEXT,
    source_creator_avatar_url TEXT,
    source_creator_display_name TEXT,
    content_type TEXT NOT NULL DEFAULT 'text' CHECK (content_type IN ('image','carousel','video','text','mixed')),
    raw_caption TEXT,
    raw_hashtags TEXT[] NOT NULL DEFAULT '{}',
    original_post_data JSONB,
    ai_summary TEXT,
    structured_data JSONB,
    content_classification TEXT,
    category_id UUID REFERENCES public.categories(id),
    subcategory_id UUID REFERENCES public.subcategories(id),
    ai_tags TEXT[] NOT NULL DEFAULT '{}',
    user_notes TEXT,
    embedding vector(1536),
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    preferred_view TEXT NOT NULL DEFAULT 'clean' CHECK (preferred_view IN ('clean','original')),
    processing_status TEXT NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending','processing','complete','failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own items" ON public.saved_items
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS saved_items_fts ON public.saved_items USING gin(to_tsvector('english', COALESCE(ai_summary,'') || ' ' || COALESCE(raw_caption,'')));
CREATE INDEX IF NOT EXISTS saved_items_embedding ON public.saved_items USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Saved item media
CREATE TABLE IF NOT EXISTS public.saved_item_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    saved_item_id UUID NOT NULL REFERENCES public.saved_items(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL CHECK (media_type IN ('image','video','thumbnail')),
    storage_path TEXT NOT NULL,
    ocr_text TEXT,
    transcription_text TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.saved_item_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own media" ON public.saved_item_media
    USING (EXISTS (SELECT 1 FROM public.saved_items s WHERE s.id = saved_item_id AND s.user_id = auth.uid()));

-- User follows
CREATE TABLE IF NOT EXISTS public.user_follows (
    follower_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);

-- Shared items
CREATE TABLE IF NOT EXISTS public.shared_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    saved_item_id UUID NOT NULL REFERENCES public.saved_items(id) ON DELETE CASCADE,
    shared_by_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    share_type TEXT NOT NULL CHECK (share_type IN ('link','direct','collection')),
    share_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    include_notes BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
