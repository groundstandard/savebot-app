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
const N8N_EMBED_WEBHOOK_URL = Deno.env.get('N8N_EMBED_WEBHOOK_URL') ?? ''; // n8n → OpenAI embeddings (semantic search)
const N8N_TIKTOK_WEBHOOK_URL = Deno.env.get('N8N_TIKTOK_WEBHOOK_URL') ?? ''; // n8n → scraper: TikTok caption + video
const N8N_X_WEBHOOK_URL = Deno.env.get('N8N_X_WEBHOOK_URL') ?? ''; // n8n → scraper: X/Twitter full text

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
 * Embed text via the n8n embeddings webhook (OpenAI text-embedding-3-small, 1536-dim).
 * Best-effort: returns null if unconfigured or on any failure, so semantic search is
 * purely additive — the item still saves and stays keyword-searchable.
 */
async function embedText(text: string): Promise<number[] | null> {
  if (!N8N_EMBED_WEBHOOK_URL || !text.trim()) return null;
  try {
    const res = await fetch(N8N_EMBED_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.slice(0, 8000) }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const emb = j.embedding ?? j.data?.[0]?.embedding;
    return Array.isArray(emb) && emb.length === 1536 ? emb : null;
  } catch {
    return null;
  }
}

/**
 * Collect every image URL a scraper might return for a post — a carousel/slides
 * post has many, and different scrapers name the array differently. Deduped, in
 * order, so we can OCR each slide instead of only the first.
 */
function collectImageUrls(j: any): string[] {
  const urls: string[] = [];
  const push = (u: any) => { if (typeof u === 'string' && u.startsWith('http')) urls.push(u); };
  if (Array.isArray(j.images)) j.images.forEach((x: any) => push(typeof x === 'string' ? x : x?.url || x?.displayUrl));
  if (Array.isArray(j.displayUrls)) j.displayUrls.forEach(push);
  if (Array.isArray(j.childPosts)) j.childPosts.forEach((c: any) => push(c?.displayUrl || c?.thumbnail_url || c?.url));
  if (Array.isArray(j.sidecarItems)) j.sidecarItems.forEach((c: any) => push(c?.displayUrl || c?.url));
  if (Array.isArray(j.carousel_media)) j.carousel_media.forEach((c: any) => push(c?.image_url || c?.displayUrl || c?.url));
  push(j.thumbnail_url || j.thumbnailUrl || j.displayUrl); // single-image fallback / cover
  return [...new Set(urls)];
}

/**
 * Instagram / Facebook post content via the n8n workflow (which calls a scraper
 * such as Apify). Sends { url }, expects { caption, author, thumbnail_url } and,
 * for a carousel, an array of slide image URLs. Returns {} on any failure so
 * processing degrades gracefully; never throws.
 */
async function fetchInstagramContent(
  url: string
): Promise<{ caption?: string; author?: string; thumbnailUrl?: string; videoUrl?: string; images?: string[] }> {
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
      videoUrl: j.video_url || j.videoUrl || undefined,
      images: collectImageUrls(j),
    };
  } catch {
    return {};
  }
}

/**
 * TikTok content via an n8n workflow (scraper). Sends { url }, expects
 * { caption, author, thumbnail_url, video_url }. The video URL feeds Whisper
 * transcription. Returns {} on any failure so processing degrades gracefully.
 */
async function fetchTikTokContent(
  url: string
): Promise<{ caption?: string; author?: string; thumbnailUrl?: string; videoUrl?: string }> {
  if (!N8N_TIKTOK_WEBHOOK_URL || !url) return {};
  try {
    const res = await fetch(N8N_TIKTOK_WEBHOOK_URL, {
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
      author: j.author || j.authorName || undefined,
      thumbnailUrl: j.thumbnail_url || j.thumbnailUrl || undefined,
      videoUrl: j.video_url || j.videoUrl || undefined,
    };
  } catch {
    return {};
  }
}

/**
 * X / Twitter content via an n8n workflow (scraper). Sends { url }, expects
 * { caption, author } — fuller than oembed (full text / thread). {} on failure.
 */
async function fetchXContent(url: string): Promise<{ caption?: string; author?: string }> {
  if (!N8N_X_WEBHOOK_URL || !url) return {};
  try {
    const res = await fetch(N8N_X_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) return {};
    const j = await res.json();
    let caption = (j.caption ?? j.text ?? '').toString().trim() || undefined;
    if (caption && caption.length > 3000) caption = caption.slice(0, 3000) + '…';
    return { caption, author: j.author || j.authorName || undefined };
  } catch {
    return {};
  }
}

type Reference = { title: string; url: string; source: string };

/**
 * Search YouTube for fuller versions of the same content (Bobby: "if that full
 * podcast is available on YouTube"). Real results via the Data API — never
 * fabricated links. Best-effort: [] without a key/query or on any failure.
 */
async function youtubeSearch(query: string, max = 3): Promise<Reference[]> {
  if (!YOUTUBE_API_KEY || !query.trim()) return [];
  try {
    const u = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${max}&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}`;
    const res = await fetch(u);
    if (!res.ok) return [];
    const j = await res.json();
    return (j.items ?? [])
      .map((it: any) => ({
        title: (it.snippet?.title ?? 'YouTube video').toString(),
        url: it.id?.videoId ? `https://www.youtube.com/watch?v=${it.id.videoId}` : '',
        source: 'youtube',
      }))
      .filter((r: Reference) => !!r.url);
  } catch {
    return [];
  }
}

/**
 * Look up a person/topic on Wikipedia (free REST API, no key) and return a
 * citable reference — the canonical article title + URL. Best-effort: null on a
 * miss, a disambiguation page, or any failure. Real articles only; the URL comes
 * straight from Wikipedia's response, so citations are never fabricated.
 */
async function wikipediaLookup(term: string): Promise<Reference | null> {
  const q = (term ?? '').trim();
  if (!q) return null;
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}?redirect=true`,
      { headers: { 'User-Agent': 'SaveBot/1.0 (personal knowledge library)' } },
    );
    if (!res.ok) return null;
    const j = await res.json();
    // A disambiguation page isn't a single citable source — skip it.
    if (j.type === 'disambiguation' || !j.title) return null;
    const url = j.content_urls?.desktop?.page ?? j.content_urls?.mobile?.page;
    if (!url) return null;
    return { title: `Wikipedia — ${j.title}`, url, source: 'wikipedia' };
  } catch {
    return null;
  }
}

/** Pull any explicit links the post's caption mentions. */
function extractLinks(text: string | null): Reference[] {
  if (!text) return [];
  const urls = text.match(/https?:\/\/[^\s)]+/g) ?? [];
  return [...new Set(urls)].slice(0, 5).map((u) => ({
    title: u.replace(/^https?:\/\//, '').slice(0, 60),
    url: u,
    source: 'link',
  }));
}

/**
 * Build the reference list: links the post mentions, plus fuller sources found
 * on YouTube by searching the topic + main person. Deduped by URL, capped.
 */
async function buildReferences(
  topic: string | null,
  people: string[],
  caption: string | null,
  platform: string,
): Promise<Reference[]> {
  const refs: Reference[] = [...extractLinks(caption)];

  // Explore authoritative sources to cite (Bobby, 2026-08-26): look up the named
  // people and the main topic on Wikipedia. Real, citable articles — never made up.
  const wikiTerms = [
    ...(Array.isArray(people) ? people.slice(0, 2).map(String) : []),
    topic ?? '',
  ].map((t) => t.trim()).filter(Boolean);
  const wiki = await Promise.all([...new Set(wikiTerms)].map((t) => wikipediaLookup(t)));
  refs.push(...wiki.filter((r): r is Reference => !!r));

  // Fuller versions of the same content on YouTube — skipped when the item IS a
  // YouTube video already.
  if (platform !== 'youtube') {
    const person = Array.isArray(people) && people[0] ? String(people[0]) : '';
    const query = [person, topic].filter(Boolean).join(' ').trim() || (caption ?? '').slice(0, 80);
    refs.push(...(await youtubeSearch(query, 3)));
  }
  const seen = new Set<string>();
  return refs.filter((r) => r.url && !seen.has(r.url) && seen.add(r.url)).slice(0, 8);
}

/**
 * Send a "✓ Saved" push to every device the user has registered (push_tokens),
 * via the Expo Push API. Best-effort — a push failure never fails the save.
 */
async function sendSavePush(
  userId: string,
  title: string,
  categoryName: string | null,
  itemId: string
): Promise<void> {
  try {
    const { data: tokens } = await supabase.from('push_tokens').select('token').eq('user_id', userId);
    if (!tokens || tokens.length === 0) return;
    const body = categoryName ? `${title} → ${categoryName}` : title;
    const messages = tokens.map((t: { token: string }) => ({
      to: t.token, title: '✓ Saved', body, sound: 'default', data: { itemId },
    }));
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
  } catch {
    /* best-effort */
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
    let ig: { caption?: string; author?: string; thumbnailUrl?: string; videoUrl?: string } = {};
    if ((item.source_platform === 'instagram' || item.source_platform === 'facebook') && item.source_url) {
      ig = await fetchInstagramContent(item.source_url);
    }

    // ── 1c. TikTok + X have thin oembed data, so use their own n8n scrapers.
    // TikTok returns a video URL for Whisper transcription; X returns full text.
    let tt: { caption?: string; author?: string; thumbnailUrl?: string; videoUrl?: string } = {};
    if (item.source_platform === 'tiktok' && item.source_url) tt = await fetchTikTokContent(item.source_url);
    let xc: { caption?: string; author?: string } = {};
    if (item.source_platform === 'x' && item.source_url) xc = await fetchXContent(item.source_url);

    // ── 2 + 3. Media + OCR. Re-host every image on Supabase and OCR each one.
    // A carousel/slides post has many images and its whole point is usually text
    // ACROSS the slides — reading only the cover loses most of it. We re-host each
    // (platform CDN URLs like Instagram fbcdn often can't be fetched by OpenAI's
    // image analyzer, but a Supabase signed URL can), then OCR every slide.
    const MAX_SLIDES = 20; // IG carousels cap at 20; bounds cost + time on the rest
    const uploadedPath = opd.uploaded_image_path as string | undefined;

    /** Fetch a remote image, store it in the thumbnails bucket, return a signed URL. */
    async function rehost(srcUrl: string, idx: number): Promise<string | null> {
      try {
        const img = await fetch(srcUrl);
        if (!img.ok) return null;
        const bytes = new Uint8Array(await img.arrayBuffer());
        const path = `${item.user_id}/${saved_item_id}/img_${idx}.jpg`;
        const { error } = await supabase.storage
          .from(THUMB_BUCKET).upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
        if (error) return null;
        const { data: signed } = await supabase.storage.from(THUMB_BUCKET).createSignedUrl(path, 600);
        return signed?.signedUrl ?? null;
      } catch { return null; }
    }

    // Signed image URLs to OCR, in slide order. A manual upload (Add → Image) is
    // already in the private user-media bucket, so we just sign it.
    let signedSlides: string[] = [];
    let thumbStoragePath: string | null = null;
    if (uploadedPath) {
      const { data: signed } = await supabase.storage.from('user-media').createSignedUrl(uploadedPath, 600);
      if (signed?.signedUrl) { signedSlides = [signed.signedUrl]; thumbStoragePath = `user-media/${uploadedPath}`; }
    } else {
      const igImages = Array.isArray(ig.images) ? ig.images : [];
      const cover = [oembed.thumbnail_url, ig.thumbnailUrl, tt.thumbnailUrl].find(Boolean) as string | undefined;
      const sources = (igImages.length ? igImages : cover ? [cover] : []).slice(0, MAX_SLIDES);
      const rehosted = await Promise.all(sources.map((u, i) => rehost(u, i)));
      signedSlides = rehosted.filter((x): x is string => !!x);
      if (signedSlides.length) thumbStoragePath = `${THUMB_BUCKET}/${item.user_id}/${saved_item_id}/img_0.jpg`;
    }

    // Record the first image as the card thumbnail (replace any prior row; safe on retry).
    if (thumbStoragePath) {
      await supabase.from('saved_item_media')
        .delete().eq('saved_item_id', saved_item_id).eq('media_type', 'thumbnail');
      await supabase.from('saved_item_media').insert({
        saved_item_id, media_type: 'thumbnail', storage_path: thumbStoragePath, sort_order: 0,
      });
    }

    // OCR every slide (parallel) and label them so the AI can organize across slides.
    const ocrResults = await Promise.all(
      signedSlides.map((u) => n8nText(N8N_OCR_WEBHOOK_URL, { image_url: u })),
    );
    const ocrText = ocrResults
      .map((t, i) => (t ? (signedSlides.length > 1 ? `Slide ${i + 1}: ${t}` : t) : ''))
      .filter(Boolean)
      .join('\n\n');
    // Video isn't downloaded yet (only a thumbnail is stored), so this stays
    // empty until the media pipeline provides a video/audio URL.
    // Video/audio for transcription: the IG/FB scraper returns a video URL for
    // Reels; Whisper (n8n) transcribes it. YouTube uses its caption track below.
    const videoUrl = ig.videoUrl ?? tt.videoUrl ?? (opd.video_url as string | undefined) ?? null;
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
    const caption = ig.caption ?? tt.caption ?? xc.caption ?? oembed.title ?? yt.title ?? item.raw_caption ?? null;
    const assembled = [
      caption,
      yt.description ? `Description:\n${yt.description}` : '',
      (yt.transcript || transcript) ? `Transcript:\n${yt.transcript || transcript}` : '',
      ocrText ? `On-screen text from the post's image(s)/slides:\n${ocrText}` : '',
    ].filter(Boolean).join('\n\n');

    const update: Record<string, any> = {
      raw_caption: caption,
      source_creator_handle: ig.author ?? tt.author ?? xc.author ?? oembed.author_name ?? item.source_creator_handle ?? null,
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
      // In-depth write-up (Bobby: "write more details about the post", 2026-08-26).
      update.ai_details = (typeof extracted.details === 'string' && extracted.details.trim()) ? extracted.details.trim() : null;
      update.structured_data = extracted.structured_data ?? null;
      update.content_classification = extracted.content_type ?? null;
      update.ai_tags = extracted.tags ?? [];
      // Organization axes (Bobby): famous people, topic, moral-lesson theme.
      update.people = Array.isArray(extracted.people) ? extracted.people.filter((p: unknown) => typeof p === 'string' && p.trim()).slice(0, 12) : [];
      update.topic = (typeof extracted.topic === 'string' && extracted.topic.trim()) ? extracted.topic.trim() : null;
      update.moral_lesson = (typeof extracted.moral_lesson === 'string' && extracted.moral_lesson.trim()) ? extracted.moral_lesson.trim() : null;
      // External references: fuller sources online (real YouTube search) + links the post mentions.
      update.reference_links = await buildReferences(update.topic, update.people, caption, item.source_platform);
      if (matchedCategory?.id) update.category_id = matchedCategory.id;
      // Keep the model's self-reported confidence so the UI can flag low-confidence saves.
      const conf = typeof extracted.confidence === 'number' ? extracted.confidence : null;
      update.original_post_data = { ...update.original_post_data, ai_confidence: conf };
    } catch (aiErr) {
      // Keep the fetched content; record the AI failure without failing the save.
      update.original_post_data = { ...opd, oembed, ocr: ocrText || null, transcript: transcript || null, ai_error: String(aiErr) };
    }

    // ── 5. Embedding for semantic search (best-effort; needs N8N_EMBED_WEBHOOK_URL).
    // Embed the richest text we have so natural-language queries can find this item.
    const embedInput = [
      update.ai_summary,
      update.ai_details,
      update.topic,
      Array.isArray(update.people) ? update.people.join(' ') : '',
      Array.isArray(update.ai_tags) ? update.ai_tags.join(' ') : '',
      caption,
      assembled,
    ].filter(Boolean).join('\n');
    const vector = await embedText(embedInput);
    if (vector) update.embedding = vector;

    await supabase.from('saved_items').update(update).eq('id', saved_item_id);

    // ── 6. Notify the user's devices (best-effort; needs a registered push token
    // + a push-capable build). Foreground clients also get it via the app handler.
    const notifyTitle = (update.ai_summary || caption || 'New save').toString().slice(0, 60);
    const notifyCategory = categories?.find((cc: { id: string; name: string }) => cc.id === update.category_id)?.name ?? null;
    await sendSavePush(item.user_id, notifyTitle, notifyCategory, saved_item_id);

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

RULE 1 — accuracy. Do not invent:
- Use ONLY facts explicitly present in the content provided below (caption, description, transcript, on-screen slide text).
- NEVER guess or infer specifics that aren't there. Do NOT fabricate tips, steps, ingredients, numbers, or list items just to fill the schema. Making up plausible-sounding content is a failure.
- If a detail isn't in the content, leave that field null or that list []. An empty list is correct; an invented list is wrong.
- If there is genuinely no usable content at all, write a brief honest summary such as "Not enough detail was available to analyze this item." and leave all lists empty. Never copy the schema's placeholder text.

RULE 2 — completeness & depth. When content IS present, capture ALL of it, explain it, and organize it:
- The source may include MANY slides (labeled "Slide 1", "Slide 2", …) and/or a full transcript. Read EVERY slide and the whole transcript — not just the first.
- Turn each distinct point, step, name, date, definition, quote, or claim the post actually makes into its own list item. Do NOT collapse a rich, detailed post into one vague sentence.
- "summary" is the quick gist — 2-3 sentences someone can read at a glance.
- "details" is where the depth lives: a thorough, multi-paragraph walk-through of what the post ACTUALLY says — its specifics, context, reasoning, examples, named people, numbers, and quotes, slide by slide / point by point. Go well beyond the summary; do not stop at a high-level gloss. Aim for a genuinely informative write-up (several short paragraphs) whenever the content supports it — a reader who never opens the original post should understand its full substance from "details" alone.
- key_points / structured lists should still reflect its full breadth — everything it genuinely says, in order.
- Set "confidence" from how much real content you had: a full multi-slide/transcript post you captured well → 0.8+; only a thin title and no body → 0.2 or lower.

Analyze this content and return a JSON object:

{
  "content_type": "recipe|workout|travel|product|education|advice|entertainment|other",
  "confidence": 0.0-1.0,
  "title": "Brief descriptive title",
  "summary": "2-3 sentence overview — the quick gist at a glance",
  "details": "An in-depth, multi-paragraph explanation of the post grounded ONLY in the content below. Separate paragraphs with a blank line. Walk through the full substance — every slide/section/point with its specifics, context, reasoning, examples, names, numbers, and quotes — so a reader understands the post without opening it. Keep it honest and short if the content is genuinely thin; NEVER pad with invented material.",
  "category": "Best matching category name from the user's list",
  "subcategory": "Best matching subcategory",
  "tags": ["tag1", "tag2", "tag3"],
  "people": ["Notable/famous people the content is ABOUT or quotes — real names only, [] if none"],
  "topic": "The single main topic in a few words (e.g. 'Heraclitus' philosophical paradoxes')",
  "moral_lesson": "EXACTLY ONE label from the Moral-lesson themes list below",
  "structured_data": { ...type-specific extraction... }
}

Moral-lesson themes (pick the ONE that best fits; this list is exhaustive — use "Other" only if truly nothing fits):
Business & Money, Career & Work, Mindset & Discipline, Productivity & Habits, Leadership, Personal Growth, Spiritual Growth, Philosophy & Wisdom, Relationships & Love, Health & Fitness, Mental & Emotional Wellbeing, Creativity, Learning & Education, Society & Culture, Other

For "people": include only real, named individuals the content is genuinely about or quotes (e.g. authors, historical figures, public figures). Do NOT include the poster/creator unless the content is about them. [] if none are named.

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
