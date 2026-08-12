import { supabase } from '../supabase';

export interface PublicProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  is_public: boolean;
  followers_count: number;
  following_count: number;
  is_following: boolean;
}

export interface PublicUser {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

/** Safe public profile (name, avatar, counts, is_following). Null if private/unavailable. */
export async function getPublicProfile(userId: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase.rpc('get_public_profile', { target: userId });
  if (error || !data || (data as unknown[]).length === 0) return null;
  const r = (data as Record<string, unknown>[])[0];
  return {
    id: r.id as string,
    display_name: (r.display_name as string) ?? null,
    avatar_url: (r.avatar_url as string) ?? null,
    is_public: !!r.is_public,
    followers_count: Number(r.followers_count) || 0,
    following_count: Number(r.following_count) || 0,
    is_following: !!r.is_following,
  };
}

export async function followUser(followingId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  await supabase.from('user_follows').insert({ follower_id: session.user.id, following_id: followingId });
}

export async function unfollowUser(followingId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  await supabase.from('user_follows')
    .delete()
    .eq('follower_id', session.user.id)
    .eq('following_id', followingId);
}

/** Search discoverable (public) users by display name. Empty for queries under 2 chars. */
export async function searchPublicUsers(query: string): Promise<PublicUser[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const { data, error } = await supabase.rpc('search_public_users', { q, lim: 25 });
  if (error) return [];
  return (data as PublicUser[]) ?? [];
}

export interface FeedItem {
  id: string;
  user_id: string;
  author_name: string | null;
  author_avatar: string | null;
  ai_summary: string | null;
  raw_caption: string | null;
  content_classification: string | null;
  category_id: string | null;
  source_platform: string | null;
  source_url: string | null;
  created_at: string;
}

/** Public saves from people the current user follows, newest first. */
export async function getFollowingFeed(): Promise<FeedItem[]> {
  const { data, error } = await supabase.rpc('get_following_feed', { lim: 50 });
  if (error) return [];
  return (data as FeedItem[]) ?? [];
}
