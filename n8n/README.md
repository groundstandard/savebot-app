# SaveBot — n8n Content Ingestion

Content fetching runs on **n8n** (same engine choice as the Answer Engine): the
app stores a pending save, then n8n fetches the post details and writes them back
to Supabase. Supabase is only the store — no fetching happens in the app.

## Flow

```
App (share / Add screen)
  └─ inserts pending saved_items row  (source_platform, source_url, original_post_data)
  └─ POST → n8n webhook  { saved_item_id, url, platform, content_id, oembed_url, needs_auth, text }
        └─ n8n: fetch oembed (TikTok / YouTube / X)  →  PATCH saved_items via Supabase REST
              (raw_caption, source_creator_handle, original_post_data.oembed, processing_status)
```

If the app's `EXPO_PUBLIC_N8N_SAVE_WEBHOOK_URL` is **not** set, it falls back to
the `process-save-item` Supabase Edge Function — so nothing breaks before n8n is wired.

## 1. Import the workflow

In n8n (the self-hosted Railway instance we already run for the Answer Engine, or a
new one): **Workflows → Import from File →** `n8n/savebot-ingest.json`.
It creates **SaveBot — Content Ingestion** (Webhook → Fetch + Store → Respond).

## 2. Add Supabase credentials to the workflow

Open the **Fetch + Store** node and set two values at the top of the code:

```js
const SUPABASE_URL = 'https://xzjvgsovcaefrcvjenru.supabase.co';   // SaveBot project URL
const SERVICE_KEY  = 'PASTE_SUPABASE_SERVICE_ROLE_KEY';            // Settings → API → service_role
```

The **service_role** key bypasses RLS so n8n can update any user's saved item — keep
it only inside n8n (never in the app). It is stored encrypted in n8n's database.

## 3. Activate + copy the webhook URL

Toggle the workflow **Active**. The production webhook path is:

```
https://<your-n8n>.up.railway.app/webhook/savebot-ingest
```

## 4. Point the app at the webhook

In the app's `.env` add:

```
EXPO_PUBLIC_N8N_SAVE_WEBHOOK_URL=https://<your-n8n>.up.railway.app/webhook/savebot-ingest
```

Rebuild/restart Expo. New saves now route through n8n.

## 5. Test

- In the **Add** tab, paste a TikTok or YouTube link → Save.
- The item appears as *pending*, then flips to *complete* with a caption + creator once
  n8n finishes. Check the n8n execution log if it stays pending.

## What this covers vs. what's next

**Done here (Sprint 3 — Week 6 fetch):**
- Platform URL parser (TikTok / YouTube / X / Instagram / Facebook detection + IDs)
- oembed fetch for TikTok, YouTube, X → caption/title, creator, thumbnail URL
- Write-back to `saved_items` + `original_post_data`, `processing_status` lifecycle
- Client-side `retryProcessing()` for stuck items

**Still needs work (flagged, not silently skipped):**
- **Instagram / Facebook** fetching — oembed needs a Facebook app token; `needs_auth`
  is flagged so a dedicated fetcher can be added. For now those saves keep the shared
  text and stay usable.
- **Media binary → Supabase Storage + `saved_item_media`** — the workflow captures the
  remote `thumbnail_url`; downloading the file, generating thumbnails, and uploading to
  the private `thumbnails` / `user-media` buckets is the next node to add.
- **Native share extensions (Week 5)** — iOS share extension + Android intent filters
  require an EAS build + real-device testing (can't be done in the managed dev server).
