-- SaveBot: Migration 006 — device push tokens for remote push notifications.
-- Each user can register one or more device (Expo) push tokens. The
-- process-save-item Edge Function reads these to send a "✓ Saved" push when an
-- item finishes processing. Safe to re-run.

CREATE TABLE IF NOT EXISTS public.push_tokens (
    user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token      text NOT NULL,
    platform   text,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, token)
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- A user manages only their own device tokens.
DROP POLICY IF EXISTS "Users manage own push tokens" ON public.push_tokens;
CREATE POLICY "Users manage own push tokens" ON public.push_tokens
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
