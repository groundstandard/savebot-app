-- Organization dimensions (Bobby, 2026-08-17): let the library be organized by
-- the famous person(s) mentioned, the topic, and a moral-lesson theme — each an
-- orthogonal axis to the existing category. The link to the original post is
-- already saved_items.source_url.
alter table saved_items
  add column if not exists people       text[] not null default '{}',
  add column if not exists topic        text,
  add column if not exists moral_lesson text;

-- Fast grouping/filtering along each axis.
create index if not exists idx_saved_items_moral_lesson on saved_items (moral_lesson);
create index if not exists idx_saved_items_topic         on saved_items (topic);
create index if not exists idx_saved_items_people        on saved_items using gin (people);
