-- SaveBot: Migration 005 — semantic search match function (pgvector).
-- The embedding column (vector 1536) + ivfflat cosine index already exist
-- (migration 001). This adds the nearest-neighbour lookup. Safe to re-run.

CREATE OR REPLACE FUNCTION public.match_saved_items(
    query_embedding vector(1536),
    match_user_id uuid,
    match_count int DEFAULT 30
)
RETURNS SETOF public.saved_items
LANGUAGE sql
STABLE
AS $$
    SELECT *
    FROM public.saved_items
    WHERE user_id = match_user_id
      AND is_archived = false
      AND embedding IS NOT NULL
    ORDER BY embedding <=> query_embedding      -- cosine distance (smaller = closer)
    LIMIT LEAST(GREATEST(match_count, 1), 50);
$$;

GRANT EXECUTE ON FUNCTION public.match_saved_items(vector, uuid, int) TO authenticated, service_role;
