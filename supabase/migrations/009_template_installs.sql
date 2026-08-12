-- SaveBot: Migration 009 — bump a community template's install_count.
-- The installer isn't the template's creator, so RLS blocks a direct UPDATE;
-- this SECURITY DEFINER function increments it safely. Safe to re-run.

CREATE OR REPLACE FUNCTION public.increment_template_installs(template_id uuid)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
    UPDATE public.community_templates
    SET install_count = install_count + 1, updated_at = now()
    WHERE id = template_id;
$$;
GRANT EXECUTE ON FUNCTION public.increment_template_installs(uuid) TO authenticated;
