# SaveBot — AI on n8n

**All AI runs on n8n.** The Edge Function only fetches + stores; every AI step is a
separate n8n webhook it calls.

```
Add / share  →  saved_items (pending)
      │
      ▼  Supabase Edge Function  (process-save-item)   ← fetch + storage only
      ├─ fetch post details (oembed: TikTok / YouTube / X)
      ├─ download thumbnail → private `thumbnails` bucket → saved_item_media
      ├─ OCR         ──►  n8n  savebot-ocr        (Vision → { text })
      ├─ transcribe  ──►  n8n  savebot-transcribe  (Whisper → { text })   [staged*]
      └─ extract     ──►  n8n  savebot-ai          (LLM → { text: "<JSON>" })
      ▼
   saved_items updated (summary, tags, category, structured_data, complete)
```

- **Edge Function = fetching + storage** (Supabase only, no AI).
- **n8n = all AI** — three separate workflows, same gateway pattern as the Answer
  Engine but **separate** from it.
- The Edge Function assembles `caption + OCR + transcript` and sends that to
  `savebot-ai` for the structured extraction.

*staged = the transcribe step stays idle until the media pipeline downloads the
source video (today only a thumbnail is stored, so there's no audio input yet).

## Workflows to import
| File | Webhook path | Purpose |
|---|---|---|
| `savebot-ai.json` | `/webhook/savebot-ai` | LLM extraction → structured JSON |
| `savebot-ocr.json` | `/webhook/savebot-ocr` | Vision OCR of the post image |
| `savebot-transcribe.json` | `/webhook/savebot-transcribe` | Whisper transcription (staged) |

Each Code node has an `OPENAI_API_KEY` placeholder (or OpenAI credential for
`savebot-ai`) — set it once per workflow. Then set the matching function secrets:

```bash
supabase secrets set N8N_AI_WEBHOOK_URL=https://<host>/webhook/savebot-ai
supabase secrets set N8N_OCR_WEBHOOK_URL=https://<host>/webhook/savebot-ocr
supabase secrets set N8N_TRANSCRIBE_WEBHOOK_URL=https://<host>/webhook/savebot-transcribe
```

Any unset webhook is simply skipped (best-effort) — the save still completes with
whatever content was gathered.

---

## savebot-ai setup (LLM extraction)

## 1. Import the workflow

n8n → **Workflows → Import from File** → `n8n/savebot-ai.json`.
Creates **SaveBot — AI Extraction** (Webhook → LLM Agent → OpenAI → Build Response → Respond).

## 2. Select the OpenAI credential

Open the **OpenAI Chat Model** node → pick your OpenAI credential (the same
"OpenAi account" the Answer Engine uses is fine — this is only the model provider,
the workflows stay separate). Model defaults to `gpt-4o-mini`.

## 3. Activate + copy the webhook URL

Toggle **Active**. Production webhook:

```
https://<your-n8n-host>/webhook/savebot-ai
```

## 4. Point the Edge Function at it

Set it as a Supabase function secret, then deploy:

```bash
supabase secrets set N8N_AI_WEBHOOK_URL=https://<your-n8n-host>/webhook/savebot-ai
supabase functions deploy process-save-item
```

## 5. Test

Add a TikTok/YouTube link in the app → the item goes *pending* → *complete* with a
caption, thumbnail, summary, tags, and auto-category.

**Contract:** the Edge Function POSTs `{ system, prompt }` and expects `{ text }` back
(the model's JSON as a string). If `N8N_AI_WEBHOOK_URL` is unset or the call fails, the
item still completes with the fetched content — only the AI fields are skipped
(`ai_error` recorded in `original_post_data`).
