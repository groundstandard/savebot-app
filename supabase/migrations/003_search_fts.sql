-- Migration 003: full-text search for the library.
--
-- Indexes everything worth searching — AI summary, raw caption, user notes, AI
-- tags, and the structured data (recipe/workout/etc. as text) — into a tsvector
-- column with a GIN index, so the app's .textSearch('fts', …) runs fast + ranked.
--
-- Uses a TRIGGER (not a GENERATED column): the combined expression includes
-- functions Postgres doesn't treat as IMMUTABLE (array_to_string / jsonb::text),
-- which a generated column rejects (42P17). A trigger has no such restriction.
-- Until this is applied the app falls back to ILIKE, so it's safe to ship first.

alter table public.saved_items add column if not exists fts tsvector;

create or replace function public.saved_items_fts_update()
returns trigger
language plpgsql
as $$
begin
  new.fts := to_tsvector(
    'english',
    coalesce(new.ai_summary, '') || ' ' ||
    coalesce(new.raw_caption, '') || ' ' ||
    coalesce(new.user_notes, '') || ' ' ||
    coalesce(array_to_string(new.ai_tags, ' '), '') || ' ' ||
    coalesce(new.structured_data::text, '')
  );
  return new;
end;
$$;

drop trigger if exists trg_saved_items_fts on public.saved_items;
create trigger trg_saved_items_fts
  before insert or update on public.saved_items
  for each row execute function public.saved_items_fts_update();

create index if not exists idx_saved_items_fts
  on public.saved_items using gin (fts);

-- Backfill existing rows (the trigger only fires on future writes).
update public.saved_items set fts = to_tsvector(
  'english',
  coalesce(ai_summary, '') || ' ' ||
  coalesce(raw_caption, '') || ' ' ||
  coalesce(user_notes, '') || ' ' ||
  coalesce(array_to_string(ai_tags, ' '), '') || ' ' ||
  coalesce(structured_data::text, '')
);
