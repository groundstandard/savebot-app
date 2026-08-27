-- Richer AI write-up. The AI already produces a short `ai_summary` (the gist);
-- Bobby asked for the AI to "write more details about the post" (2026-08-26).
-- `ai_details` holds an in-depth, multi-paragraph explanation grounded in the
-- post's real content — shown as a "Details" section under the summary.
alter table saved_items add column if not exists ai_details text;
