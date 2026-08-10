import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// All AI runs on n8n (our AI gateway). The Edge Function only fetches + stores,
// then delegates each AI step to these webhooks. Set as function secrets.
const N8N_AI_WEBHOOK_URL = Deno.env.get('N8N_AI_WEBHOOK_URL') ?? '';           // LLM extraction
const N8N_OCR_WEBHOOK_URL = Deno.env.get('N8N_OCR_WEBHOOK_URL') ?? '';         // Vision OCR
const N8N_TRANSCRIBE_WEBHOOK_URL = Deno.env.get('N8N_TRANSCRIBE_WEBHOOK_URL') ?? ''; // Whisper
const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY') ?? ''; // official Data API (reliable title + description)
const N8N_INSTAGRAM_WEBHOOK_URL = Deno.env.get('N8N_INSTAGRAM_WEBHOOK_URL') ?? ''; // n8n → scraper: IG/FB post content

const THUMB_BUCKET = 'thumbnails';

/** POST to an n8n AI webhook and return its { text }. Best-effort — '' on failure. */
async function n8nText(url: string, payload: Record<string, unknown>): Promise<string> {
  if (!url) return '';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return '';
    const json = await res.json();
    return (json.text ?? '').toString().trim();
  } catch {
    return '';
  }
}

/**
 * Instagram / Facebook post content via the n8n workflow (which calls a scraper
 * such as Apify). Sends { url }, expects { caption, author, thumbnail_url }.
 * Returns {} on any failure so processing degrades gracefully; never throws.
 */
async function fetchInstagramContent(
  url: string
): Promise<{ caption?: string; author?: string; thumbnailUrl?: string }> {
  if (!N8N_INSTAGRAM_WEBHOOK_URL || !url) return {};
  try {
    const res = await fetch(N8N_INSTAGRAM_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) return {};
    const j = await res.json();
    let caption = (j.caption ?? '').toString().trim() || undefined;
    if (caption && caption.length > 3000) caption = caption.slice(0, 3000) + '…';
    return {
      caption,
      author: j.author || j.owner || j.ownerUsername || undefined,
      thumbnailUrl: j.thumbnail_url || j.thumbnailUrl || j.displayUrl || undefined,
    };
  } catch {
    return {};
  }
}

serve(async (req) => {
  const { saved_item_id } = await req.json();

  await supabase.from('saved_items').update({ processing_status: 'processing' }).eq('id', saved_item_id);

  try {
    const { data: item } = await supabase.from('saved_items').select('*').eq('id', saved_item_id).single();
    if (!item) throw new Error('Item not found');

    const opd = (item.original_post_data ?? {}) as Record<string, any>;

    // ── 1. Fetch the post details (oembed) — best effort, never fails the item.
    let oembed: Record<string, any> = {};
    if (opd.oembed_url) {
      try {
        const res = await fetch(opd.oembed_url, { headers: { 'User-Agent': 'SaveBot/1.0' } });
        if (res.ok) {
          const o = await res.json();
          oembed = {
            title: o.title ?? null,
            author_name: o.author_name ?? null,
            author_url: o.author_url ?? null,
            thumbnail_url: o.thumbnail_url ?? null,
            provider: o.provider_name ?? item.source_platform,
            html: o.html ?? null,
          };
        }
      } catch (e) {
        oembed = { fetch_error: String(e) };
      }
    }

    // ── 1b. Instagram / Facebook lock their posts, so an n8n workflow (backed by
    // a scraper) returns { caption, author, thumbnail_url } for the shared URL.
    let ig: { caption?: string; author?: string; thumbnailUrl?: string } = {};
    if ((item.source_platform === 'instagram' || item.source_platform === 'facebook') && item.source_url) {
      ig = await fetchInstagramContent(item.source_url);
    }

    // ── 2. Media: download the thumbnail → private bucket → saved_item_media. Best effort.
    const thumbUrl = oembed.thumbnail_url ?? ig.thumbnailUrl ?? null;
    if (thumbUrl) {
      try {
        const img = await fetch(thumbUrl);
        if (img.ok) {
          const bytes = new Uint8Array(await img.arrayBuffer());
          const path = `${item.user_id}/${saved_item_id}/thumb.jpg`;
          const { error: upErr } = await supabase.storage
            .from(THUMB_BUCKET)
            .upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
          if (!upErr) {
            // Replace any prior thumbnail row (safe on retry — no unique constraint needed).
            await supabase.from('saved_item_media')
              .delete().eq('saved_item_id', saved_item_id).eq('media_type', 'thumbnail');
            await supabase.from('saved_item_media').insert({
              saved_item_id,
              media_type: 'thumbnail',
              storage_path: `${THUMB_BUCKET}/${path}`,
              sort_order: 0,
            });
          }
        }
      } catch (_e) { /* thumbnail is optional */ }
    }

    // ── 3. OCR + transcription — both delegated to n8n. Best-effort.
    // A user-uploaded image (manual Add → Image) takes priority over the oembed
    // thumbnail. It lives in the PRIVATE user-media bucket, so OCR (OpenAI Vision
    // via n8n) gets a short-lived signed URL, and we record it as the item's media.
    let uploadedImageUrl: string | null = null;
    if (opd.uploaded_image_path) {
      const { data: signed } = await supabase.storage
        .from('user-media')
        .createSignedUrl(opd.uploaded_image_path as string, 600);
      uploadedImageUrl = signed?.signedUrl ?? null;
      if (uploadedImageUrl) {
        await supabase.from('saved_item_media')
          .delete().eq('saved_item_id', saved_item_id).eq('media_type', 'thumbnail');
        await supabase.from('saved_item_media').insert({
          saved_item_id,
          media_type: 'thumbnail',
          storage_path: `user-media/${opd.uploaded_image_path}`,
          sort_order: 0,
        });
      }
    }
    const ocrTarget = uploadedImageUrl ?? oembed.thumbnail_url ?? ig.thumbnailUrl;
    const ocrText = ocrTarget
      ? await n8nText(N8N_OCR_WEBHOOK_URL, { image_url: ocrTarget })
      : '';
    // Video isn't downloaded yet (only a thumbnail is stored), so this stays
    // empty until the media pipeline provides a video/audio URL.
    const videoUrl = (opd.video_url as string | undefined) ?? null;
    const transcript = videoUrl
      ? await n8nText(N8N_TRANSCRIBE_WEBHOOK_URL, { audio_url: videoUrl })
      : '';

    // ── 3b. YouTube real content: the video's title + full description (and a
    // caption transcript when the track is served). oembed only exposes the
    // title, so without this the AI has nothing to analyze and returns a generic
    // "it's a YouTube video" summary (Bobby's TestFlight report, 2026-08-06).
    let yt: { title?: string; description?: string; transcript?: string } = {};
    if (item.source_platform === 'youtube' && opd.content_id) {
      yt = await fetchYouTubeContent(String(opd.content_id));
    }

    // ── 4. AI extraction (n8n) — enriched with title + description + OCR + transcript.
    const { data: user } = await supabase.from('users').select('onboarding_preferences').eq('id', item.user_id).single();
    const { data: categories } = await supabase.from('categories').select('id, name').eq('user_id', item.user_id);

    // Prefer the real video title; the shared text is often just the URL.
    const caption = oembed.title ?? yt.title ?? ig.caption ?? item.raw_caption ?? null;
    const assembled = [
      caption,
      yt.description ? `Description:\n${yt.description}` : '',
      (yt.transcript || transcript) ? `Transcript:\n${yt.transcript || transcript}` : '',
      ocrText ? `On-screen text:\n${ocrText}` : '',
    ].filter(Boolean).join('\n\n');

    const update: Record<string, any> = {
      raw_caption: caption,
      source_creator_handle: oembed.author_name ?? ig.author ?? item.source_creator_handle ?? null,
      original_post_data: {
        ...opd, oembed,
        youtube: (yt.description || yt.transcript)
          ? { description: yt.description ?? null, transcript: yt.transcript ?? null }
          : undefined,
        ocr: ocrText || null,
        transcript: (yt.transcript || transcript) || null,
      },
      processing_status: 'complete',
    };

    try {
      if (!N8N_AI_WEBHOOK_URL) throw new Error('N8N_AI_WEBHOOK_URL not configured');

      const prompt = buildExtractionPrompt({
        caption: assembled || caption,
        url: item.source_url,
        platform: item.source_platform,
        userPrefs: user?.onboarding_preferences,
        categories,
      });

      // Delegate the LLM call to the SaveBot n8n workflow, which returns { text }.
      const aiRes = await fetch(N8N_AI_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: 'You are a precise content extraction engine for SaveBot. Return valid JSON only.',
          prompt,
        }),
      });
      if (!aiRes.ok) throw new Error(`n8n AI webhook ${aiRes.status}`);
      const aiJson = await aiRes.json();
      const extracted = parseJSON(aiJson.text ?? '');

      const matchedCategory = categories?.find(
        (c) => c.name.toLowerCase().includes((extracted.category ?? '').toLowerCase())
      );

      update.ai_summary = extracted.summary ?? null;
      update.structured_data = extracted.structured_data ?? null;
      update.content_classification = extracted.content_type ?? null;
      update.ai_tags = extracted.tags ?? [];
      if (matchedCategory?.id) update.category_id = matchedCategory.id;
      // Keep the model's self-reported confidence so the UI can flag low-confidence saves.
      const conf = typeof extracted.confidence === 'number' ? extracted.confidence : null;
      update.original_post_data = { ...update.original_post_data, ai_confidence: conf };
    } catch (aiErr) {
      // Keep the fetched content; record the AI failure without failing the save.
      update.original_post_data = { ...opd, oembed, ocr: ocrText || null, transcript: transcript || null, ai_error: String(aiErr) };
    }

    await supabase.from('saved_items').update(update).eq('id', saved_item_id);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    await supabase.from('saved_items').update({ processing_status: 'failed' }).eq('id', saved_item_id);
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});

function buildExtractionPrompt({ caption, url, platform, userPrefs, categories }: any): string {
  // Past corrections: content_type → category the user re-filed to. Nudges the
  // model to match how this user actually organizes their library.
  const corrections: Array<{ content_type?: string; category?: string }> = userPrefs?.corrections ?? [];
  const correctionsLine = corrections.length
    ? corrections.map((x) => `${x.content_type ?? 'other'} → ${x.category}`).join('; ')
    : 'none';

  return `You are a content analysis engine for SaveBot — an AI-powered personal knowledge library.

CRITICAL — accuracy over completeness. This is the most important rule:
- Use ONLY facts that are explicitly present in the content provided below (title, description, transcript, on-screen text).
- NEVER invent, guess, or infer specifics. Do NOT fabricate tips, steps, ingredients, numbers, or any list items just to fill the schema. Making up plausible-sounding content is a failure.
- If the actual details are not in the content, return an EMPTY list ([]) for them and write only a short, honest, general summary of what the content appears to be about. An empty list is correct; an invented list is wrong.
- Set "confidence" from how much real detail you actually had: only a title / thin description and no transcript → 0.2 or lower.
- Never copy the placeholder text from the schema. If there is genuinely no usable content, write a brief honest summary such as "Not enough detail was available to analyze this item." and leave all lists empty.

Analyze this content and return a JSON object:

{
  "content_type": "recipe|workout|travel|product|education|advice|entertainment|other",
  "confidence": 0.0-1.0,
  "title": "Brief descriptive title",
  "summary": "1-2 sentence summary of the content",
  "category": "Best matching category name from the user's list",
  "subcategory": "Best matching subcategory",
  "tags": ["tag1", "tag2", "tag3"],
  "structured_data": { ...type-specific extraction... }
}

Platform: ${platform}
URL: ${url ?? 'none'}
Caption: ${caption ?? 'none'}
User interests: ${JSON.stringify(userPrefs?.interests ?? [])}
Available categories: ${categories?.map((c: any) => c.name).join(', ') ?? 'none'}
Past user corrections (content_type → preferred category) — favor these when they apply: ${correctionsLine}

For structured_data, ALWAYS include a "type" field, and use the schema appropriate to the content type:
- recipe → { "type": "recipe", dish_name, cuisine, meal_type, prep_time_minutes, cook_time_minutes, total_time_minutes, servings, difficulty ("easy"|"medium"|"hard"), dietary_tags: [], ingredients: [{item, quantity, unit, notes}], instructions: [{step, text, time_minutes}], nutrition: {calories, protein_g, carbs_g, fat_g}|null, tips: [] }
- workout → { "type": "workout", workout_name, workout_type, target_muscles: [], difficulty ("beginner"|"intermediate"|"advanced"), duration_minutes, equipment_needed: [], exercises: [{name, sets, reps, rest_seconds, notes}], tips: [] }
- travel → { "type": "travel", destination, locations: [], travel_type, recommended_season, estimated_cost, tips: [] }
- product → { "type": "product", product_name, brand, price, where_to_buy, pros: [], cons: [], category }
- education/advice/entertainment/other → { "type": "generic", title, key_points: [], actionable_items: [] }

Use null for unknown scalar fields and [] for unknown lists — always prefer empty over invented. Never omit the "type" field. Never fabricate content that isn't in the source above.
Return valid JSON only. No explanation.`;
}

function parseJSON(text: string): any {
  const clean = text.replace(/```json\n?|\n?```/g, '').trim();
  try { return JSON.parse(clean); } catch { return {}; }
}

/**
 * Best-effort fetch of a YouTube video's real content by reading the watch page
 * (no API key). Returns the title + full description reliably; the caption
 * transcript is included when YouTube serves it, but timedtext now usually needs
 * a proof-of-origin token, so the description is the dependable content signal.
 * Never throws — returns {} on any failure so processing degrades gracefully.
 */
async function fetchYouTubeContent(
  videoId: string
): Promise<{ title?: string; description?: string; transcript?: string }> {
  // 1. Official Data API first — reliable title + description. The watch-page
  // scrape below gets blocked from datacenter IPs (returns a consent/bot page),
  // so this is the dependable path once a key is configured.
  if (YOUTUBE_API_KEY) {
    try {
      const r = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`
      );
      if (r.ok) {
        const sn = (await r.json())?.items?.[0]?.snippet;
        if (sn?.title) {
          let description = (sn.description ?? '').toString().trim() || undefined;
          if (description && description.length > 3000) description = description.slice(0, 3000) + '…';
          return { title: sn.title, description };
        }
      }
    } catch { /* fall through to the page scrape */ }
  }

  // 2. Fallback: scrape the watch page (no key needed, but fragile).
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': 'CONSENT=YES+1',
      },
    });
    if (!res.ok) return {};
    const html = await res.text();
    const player = extractJsonObject(html, 'ytInitialPlayerResponse');
    if (!player) return {};

    const details = player.videoDetails ?? {};
    const title: string | undefined = details.title || undefined;
    let description: string | undefined = (details.shortDescription ?? '').toString().trim() || undefined;
    if (description && description.length > 3000) description = description.slice(0, 3000) + '…';

    let transcript: string | undefined;
    const tracks = player?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (Array.isArray(tracks) && tracks.length) {
      const track = tracks.find((t: any) => (t.languageCode ?? '').startsWith('en')) ?? tracks[0];
      if (track?.baseUrl) {
        try {
          const cr = await fetch(track.baseUrl + '&fmt=json3');
          const body = cr.ok ? await cr.text() : '';
          if (body) {
            const cj = JSON.parse(body);
            const text = (cj.events ?? [])
              .flatMap((e: any) => (e.segs ?? []).map((s: any) => s.utf8 ?? ''))
              .join('')
              .replace(/\s+/g, ' ')
              .trim();
            if (text) transcript = text.length > 12000 ? text.slice(0, 12000) + '…' : text;
          }
        } catch { /* transcript optional — timedtext often needs a pot token now */ }
      }
    }
    return { title, description, transcript };
  } catch {
    return {};
  }
}

/** Extract the first balanced {...} JSON object appearing after `marker` in `src`. */
function extractJsonObject(src: string, marker: string): any | null {
  const start = src.indexOf(marker);
  if (start === -1) return null;
  const i = src.indexOf('{', start);
  if (i === -1) return null;
  let depth = 0, inStr = false, esc = false;
  for (let j = i; j < src.length; j++) {
    const ch = src[j];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') inStr = true;
    else if (ch === '{') depth++;
    else if (ch === '}') { if (--depth === 0) { try { return JSON.parse(src.slice(i, j + 1)); } catch { return null; } } }
  }
  return null;
}
