-- Migration 003: full-text search for the library.
--
-- Adds a generated tsvector column that indexes everything worth searching —
-- the AI summary, the raw caption, user notes, the AI tags, and the structured
-- data (recipe/workout/etc. as text). Being a GENERATED STORED column it stays
-- in sync automatically on every insert/update (no trigger needed). A GIN index
-- makes ranked full-text queries fast.
--
-- The app uses .textSearch('fts', query, { type: 'websearch' }); until this is
-- applied it falls back to ILIKE, so shipping the app change first is safe.

alter table public.saved_items
  add column if not exists fts tsvector
  generated always as (
    to_tsvector(
      'english',
      coalesce(ai_summary, '') || ' ' ||
      coalesce(raw_caption, '') || ' ' ||
      coalesce(user_notes, '') || ' ' ||
      coalesce(array_to_string(ai_tags, ' '), '') || ' ' ||
      coalesce(structured_data::text, '')
    )
  ) stored;

create index if not exists idx_saved_items_fts
  on public.saved_items using gin (fts);
