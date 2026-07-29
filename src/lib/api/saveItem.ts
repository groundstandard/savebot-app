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

/** Decode a base64 string to bytes for Supabase Storage upload (RN-safe). */
function decodeBase64(b64: string): Uint8Array {
  const bin = (globalThis as unknown as { atob: (s: string) => string }).atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/**
 * Manual "Add → Image": upload a picked photo to the private user-media bucket,
 * create a pending saved_item that points at it, and kick off processing. The
 * Edge Function OCRs the image (via a signed URL) and runs AI extraction on the
 * recognized text — same pipeline as a shared link, minus the oembed fetch.
 */
export async function createSaveFromImage(base64: string, userId: string): Promise<SavedItem> {
  const path = `${userId}/uploads/${Date.now()}.jpg`;
  const { error: upErr } = await supabase.storage
    .from('user-media')
    .upload(path, decodeBase64(base64), { contentType: 'image/jpeg', upsert: true });
  if (upErr) throw upErr;

  const { data, error } = await supabase
    .from('saved_items')
    .insert({
      user_id: userId,
      source_platform: 'manual',
      source_url: null,
      raw_caption: null,
      processing_status: 'pending',
      content_type: 'image',
      raw_hashtags: [],
      ai_tags: [],
      is_favorite: false,
      is_archived: false,
      preferred_view: 'clean',
      original_post_data: { uploaded_image_path: path, platform: 'manual' },
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

/**
 * Remember that the user filed this content_type under a given category, so the
 * AI extractor can favor it next time (past-corrections learning loop). Stored
 * on users.onboarding_preferences.corrections — newest per content_type, cap 20.
 */
export async function recordCategoryCorrection(
  contentType: string | null,
  categoryName: string
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  const { data } = await supabase
    .from('users').select('onboarding_preferences').eq('id', session.user.id).single();
  const prefs = (data?.onboarding_preferences ?? {}) as Record<string, unknown>;
  const prev = Array.isArray(prefs.corrections)
    ? (prefs.corrections as Array<{ content_type: string | null; category: string }>)
    : [];
  const next = [{ content_type: contentType, category: categoryName }, ...prev.filter((c) => c.content_type !== contentType)].slice(0, 20);
  await supabase
    .from('users')
    .update({ onboarding_preferences: { ...prefs, corrections: next } })
    .eq('id', session.user.id);
}

export async function archiveItem(itemId: string): Promise<void> {
  await supabase
    .from('saved_items')
    .update({ is_archived: true })
    .eq('id', itemId);
}

export async function deleteItem(itemId: string): Promise<void> {
  await supabase.from('saved_items').delete().eq('id', itemId);
}

export async function updateNotes(itemId: string, notes: string): Promise<void> {
  await supabase
    .from('saved_items')
    .update({ user_notes: notes || null })
    .eq('id', itemId);
}

export async function updateTags(itemId: string, tags: string[]): Promise<void> {
  await supabase
    .from('saved_items')
    .update({ ai_tags: tags })
    .eq('id', itemId);
}

export async function setPreferredView(itemId: string, view: 'clean' | 'original'): Promise<void> {
  await supabase
    .from('saved_items')
    .update({ preferred_view: view })
    .eq('id', itemId);
}
