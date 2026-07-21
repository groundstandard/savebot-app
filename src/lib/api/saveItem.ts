import { supabase } from '../supabase';
import { parseSharedUrl, extractUrl } from './platformUrl';
import type { SavedItem } from '../../types';

export interface SharePayload {
  url?: string;
  text?: string;
  imageUri?: string;
}

const N8N_SAVE_WEBHOOK_URL = process.env.EXPO_PUBLIC_N8N_SAVE_WEBHOOK_URL;

export async function createSaveFromShare(
  payload: SharePayload,
  userId: string
): Promise<SavedItem> {
  // A shared payload may carry the URL in `url` or embedded in `text`.
  const url = payload.url ?? extractUrl(payload.text) ?? undefined;
  const parsed = parseSharedUrl(url);

  // Insert a pending item immediately so the user gets instant feedback.
  // original_post_data seeds the fetcher (n8n) and the Original View.
  const { data, error } = await supabase
    .from('saved_items')
    .insert({
      user_id: userId,
      source_platform: parsed.platform,
      source_url: parsed.canonicalUrl,
      raw_caption: payload.text ?? null,
      processing_status: 'pending',
      content_type: 'text',
      raw_hashtags: [],
      ai_tags: [],
      is_favorite: false,
      is_archived: false,
      preferred_view: 'clean',
      original_post_data: {
        shared_url: url ?? null,
        platform: parsed.platform,
        content_id: parsed.contentId,
        oembed_url: parsed.oembedUrl,
        needs_auth: parsed.needsAuth,
      },
    })
    .select()
    .single();

  if (error) throw error;

  triggerProcessing(data.id, { ...parsed, url, text: payload.text });
  return data as SavedItem;
}

/**
 * Kick off async processing. Prefers the n8n ingestion webhook (fetch + AI);
 * falls back to the process-save-item Edge Function when n8n isn't configured.
 * Fire-and-forget — failures leave the item 'pending' for retry, never block the UI.
 */
function triggerProcessing(savedItemId: string, ctx: Record<string, unknown>) {
  if (N8N_SAVE_WEBHOOK_URL) {
    fetch(N8N_SAVE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ saved_item_id: savedItemId, ...ctx }),
    }).catch(() => { /* stays pending; a retry sweep can re-trigger */ });
    return;
  }
  supabase.functions.invoke('process-save-item', {
    body: { saved_item_id: savedItemId, payload: ctx },
  });
}

/** Re-trigger processing for an item stuck in 'pending'/'failed'. */
export async function retryProcessing(itemId: string): Promise<void> {
  const { data } = await supabase.from('saved_items').select('*').eq('id', itemId).single();
  if (!data) return;
  await supabase.from('saved_items').update({ processing_status: 'pending' }).eq('id', itemId);
  const opd = (data.original_post_data ?? {}) as Record<string, unknown>;
  triggerProcessing(itemId, {
    url: opd.shared_url ?? data.source_url,
    platform: data.source_platform,
    content_id: opd.content_id ?? null,
    oembed_url: opd.oembed_url ?? null,
    needs_auth: opd.needs_auth ?? false,
    text: data.raw_caption,
  });
}

export async function toggleFavorite(itemId: string, isFavorite: boolean): Promise<void> {
  await supabase
    .from('saved_items')
    .update({ is_favorite: isFavorite })
    .eq('id', itemId);
}

export async function updateItemCategory(
  itemId: string,
  categoryId: string,
  subcategoryId: string | null
): Promise<void> {
  await supabase
    .from('saved_items')
    .update({ category_id: categoryId, subcategory_id: subcategoryId })
    .eq('id', itemId);
}

export async function archiveItem(itemId: string): Promise<void> {
  await supabase
    .from('saved_items')
    .update({ is_archived: true })
    .eq('id', itemId);
}
