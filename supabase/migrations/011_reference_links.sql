-- External references (Bobby, 2026-08-17): links to fuller info about the same
-- content — a matching full podcast/video found on YouTube, plus any links the
-- post itself mentions. Stored as jsonb: [{ title, url, source }].
-- ("references" is a reserved word in SQL, so the column is reference_links.)
alter table saved_items
  add column if not exists reference_links jsonb not null default '[]';
