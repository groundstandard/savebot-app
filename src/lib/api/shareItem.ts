import { Share } from 'react-native';
import { supabase } from '../supabase';
import { track } from '../analytics';
import type { SavedItem, StructuredData } from '../../types';

/** A human title for the save — prefers the structured name, then summary/caption. */
export function shareTitle(item: SavedItem): string {
  const d = item.structured_data as StructuredData | null;
  if (d) {
    if (d.type === 'recipe' && d.dish_name) return d.dish_name;
    if (d.type === 'workout' && d.workout_name) return d.workout_name;
    if (d.type === 'travel' && d.destination) return d.destination;
    if (d.type === 'product' && d.product_name) return d.product_name;
    if (d.type === 'generic' && d.title) return d.title;
  }
  const line = (s: string) => s.split('\n')[0].trim().slice(0, 80);
  if (item.ai_summary) return line(item.ai_summary);
  if (item.raw_caption) return line(item.raw_caption);
  return 'A save from SaveBot';
}

/** Structured highlights, formatted as short lines, capped so the card stays readable. */
function highlights(item: SavedItem): string[] {
  const d = item.structured_data as StructuredData | null;
  if (!d) return [];
  const out: string[] = [];
  const dot = (s: string) => `• ${s}`;

  if (d.type === 'recipe') {
    const meta = [
      d.total_time_minutes ? `${d.total_time_minutes} min` : null,
      d.servings ? `${d.servings} servings` : null,
      d.difficulty,
    ].filter(Boolean).join(' · ');
    if (meta) out.push(meta);
    d.ingredients.slice(0, 12).forEach((i) =>
      out.push(dot([i.quantity, i.unit, i.item].filter(Boolean).join(' '))));
  } else if (d.type === 'workout') {
    const meta = [
      d.duration_minutes ? `${d.duration_minutes} min` : null,
      d.difficulty, d.workout_type,
    ].filter(Boolean).join(' · ');
    if (meta) out.push(meta);
    d.exercises.slice(0, 12).forEach((e) => {
      const sub = [e.sets ? `${e.sets} sets` : null, e.reps ? `${e.reps} reps` : null].filter(Boolean).join(' × ');
      out.push(dot(sub ? `${e.name} — ${sub}` : e.name));
    });
  } else if (d.type === 'travel') {
    if (d.travel_type) out.push(d.travel_type);
    d.locations.slice(0, 12).forEach((l) => out.push(dot(l)));
  } else if (d.type === 'product') {
    const meta = [d.brand, d.price].filter(Boolean).join(' · ');
    if (meta) out.push(meta);
    if (d.where_to_buy) out.push(`Where to buy: ${d.where_to_buy}`);
    d.pros.slice(0, 5).forEach((p) => out.push(`+ ${p}`));
  } else if (d.type === 'generic') {
    d.key_points.slice(0, 8).forEach((k) => out.push(dot(k)));
  }
  return out;
}

/** Build the plain-text "share card" for a saved item. */
export function buildShareText(item: SavedItem, includeNotes: boolean): string {
  const title = shareTitle(item);
  const parts: string[] = [title];

  if (item.ai_summary && item.ai_summary.trim() !== title) parts.push('', item.ai_summary.trim());

  const hi = highlights(item);
  if (hi.length) parts.push('', ...hi);

  if (includeNotes && item.user_notes?.trim()) parts.push('', `My notes: ${item.user_notes.trim()}`);

  parts.push('', '— Saved with SaveBot');
  if (item.source_creator_handle) parts.push(`Creator: @${item.source_creator_handle}`);
  if (item.source_url) parts.push(item.source_url);

  return parts.join('\n');
}

/** Record the share for tracking (best-effort — never blocks the share sheet). */
async function recordShare(item: SavedItem, includeNotes: boolean): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from('shared_items').insert({
      saved_item_id: item.id,
      shared_by_user_id: session.user.id,
      share_type: 'direct',
      include_notes: includeNotes,
    });
  } catch {
    // Non-fatal: the share still went out even if we couldn't log it.
  }
}

/**
 * Present the OS share sheet with a formatted card for this saved item.
 * Returns true if the user completed a share (not dismissed).
 */
export async function shareSavedItem(item: SavedItem, opts: { includeNotes: boolean }): Promise<boolean> {
  const title = shareTitle(item);
  const message = buildShareText(item, opts.includeNotes);
  try {
    const res = await Share.share({ message, title }, { subject: title });
    if (res.action === Share.sharedAction) {
      recordShare(item, opts.includeNotes);
      track('item_shared', { platform: item.source_platform, include_notes: opts.includeNotes });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
