import { supabase } from '../supabase';
import type { SourcePlatform, SavedItem } from '../../types';

export interface SharePayload {
  url?: string;
  text?: string;
  imageUri?: string;
}

export async function createSaveFromShare(
  payload: SharePayload,
  userId: string
): Promise<SavedItem> {
  const platform = detectPlatform(payload.url);

  // Insert pending item immediately so user sees feedback fast
  const { data, error } = await supabase
    .from('saved_items')
    .insert({
      user_id: userId,
      source_platform: platform,
      source_url: payload.url ?? null,
      raw_caption: payload.text ?? null,
      processing_status: 'pending',
      content_type: 'text',
      raw_hashtags: [],
      ai_tags: [],
      is_favorite: false,
      is_archived: false,
      preferred_view: 'clean',
    })
    .select()
    .single();

  if (error) throw error;

  // Trigger edge function to process async
  supabase.functions.invoke('process-save-item', {
    body: { saved_item_id: data.id, payload },
  });

  return data as SavedItem;
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

function detectPlatform(url?: string): SourcePlatform {
  if (!url) return 'manual';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('facebook.com') || url.includes('fb.com')) return 'facebook';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'x';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  return 'manual';
}
