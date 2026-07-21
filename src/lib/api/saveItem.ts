import { supabase } from '../supabase';
import { parseSharedUrl, extractUrl } from './platformUrl';
import type { SavedItem } from '../../types';

export interface SharePayload {
  url?: string;
  text?: string;
  imageUri?: string;
}

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

  triggerProcessing(data.id);
  return data as SavedItem;
}

/**
 * Kick off async processing in the process-save-item Edge Function
 * (fetch post details + media, then AI extraction — see supabase/functions).
 * Fire-and-forget: it reads everything it needs from the saved_items row, so a
 * failure just leaves the item processable again via retryProcessing().
 */
function triggerProcessing(savedItemId: string) {
  supabase.functions.invoke('process-save-item', {
    body: { saved_item_id: savedItemId },
  });
}

/** Re-trigger processing for an item stuck in 'pending'/'failed'. */
export async function retryProcessing(itemId: string): Promise<void> {
  await supabase.from('saved_items').update({ processing_status: 'pending' }).eq('id', itemId);
  triggerProcessing(itemId);
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
