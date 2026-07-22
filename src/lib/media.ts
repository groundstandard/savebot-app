import { supabase } from './supabase';
import type { SavedItem, SavedItemMedia } from '../types';

/** Resolve a private-bucket media path to a temporary signed URL. */
export async function signedMediaUrl(media?: SavedItemMedia | null): Promise<string | null> {
  if (!media?.storage_path) return null;
  const [bucket, ...rest] = media.storage_path.split('/');
  const { data } = await supabase.storage.from(bucket).createSignedUrl(rest.join('/'), 3600);
  return data?.signedUrl ?? null;
}

/** Pick an item's display thumbnail media (thumbnail first, else first media). */
export function itemThumbMedia(item?: SavedItem | null): SavedItemMedia | undefined {
  return item?.media?.find((m) => m.media_type === 'thumbnail') ?? item?.media?.[0];
}
