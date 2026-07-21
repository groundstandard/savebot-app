# SaveBot — AI Extraction on n8n

**Split of responsibilities:**

```
Add / share  →  saved_items (pending)
      │
      ▼  Supabase Edge Function  (process-save-item)
      ├─ fetch post details (oembed: TikTok / YouTube / X)
      ├─ download thumbnail → private `thumbnails` bucket → saved_item_media
      └─ AI extraction  ─────►  n8n webhook  (savebot-ai)   ◄── this workflow
                                   └─ OpenAI → returns { text: "<JSON>" }
      ▼
   saved_items updated (summary, tags, category, structured_data, complete)
```

- **Edge Function does the fetching + storage** (Supabase only).
- **n8n does the AI** — same pattern as the Answer Engine (n8n as the model gateway),
  but a **separate** workflow (`savebot-ai`, not the Answer Engine's).

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
