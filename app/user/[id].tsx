import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useAuthStore } from '../../src/store/auth';
import { getPublicProfile, followUser, unfollowUser, type PublicProfile } from '../../src/lib/api/social';
import { tapFeedback } from '../../src/lib/haptics';
import { useColors } from '../../src/hooks/useColors';
import { SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW, type ColorScheme } from '../../src/constants';

export default function PublicProfileScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const myId = useAuthStore((s) => s.session?.user?.id);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setProfile(await getPublicProfile(id));
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const isMe = !!myId && myId === id;

  async function toggleFollow() {
    if (!profile || busy || isMe) return;
    tapFeedback();
    setBusy(true);
    const next = !profile.is_following;
    // Optimistic update.
    setProfile({ ...profile, is_following: next, followers_count: profile.followers_count + (next ? 1 : -1) });
    try {
      if (next) await followUser(profile.id); else await unfollowUser(profile.id);
    } catch {
      setProfile((p) => (p ? { ...p, is_following: !next, followers_count: p.followers_count + (next ? -1 : 1) } : p));
    }
    setBusy(false);
  }

  if (loading) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Profile" />
        <View style={styles.centered}><ActivityIndicator color={c.primary} size="large" /></View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Profile" />
        <View style={styles.centered}>
          <Ionicons name="lock-closed-outline" size={40} color={c.textTertiary} />
          <Text style={styles.emptyTitle}>Profile unavailable</Text>
          <Text style={styles.emptyText}>This profile is private or doesn't exist.</Text>
        </View>
      </View>
    );
  }

  const initial = profile.display_name?.[0]?.toUpperCase() ?? '?';

  return (
    <View style={styles.root}>
      <ScreenHeader title={profile.display_name ?? 'Profile'} />
      <View style={styles.hero}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>
        <Text style={styles.name}>{profile.display_name ?? 'User'}</Text>

        <View style={styles.counts}>
          <View style={styles.count}>
            <Text style={styles.countValue}>{profile.followers_count}</Text>
            <Text style={styles.countLabel}>Followers</Text>
          </View>
          <View style={styles.countDivider} />
          <View style={styles.count}>
            <Text style={styles.countValue}>{profile.following_count}</Text>
            <Text style={styles.countLabel}>Following</Text>
          </View>
        </View>

        {isMe ? (
          <View style={styles.meBadge}><Text style={styles.meText}>This is you</Text></View>
        ) : (
          <TouchableOpacity
            style={[styles.followBtn, profile.is_following && styles.followingBtn]}
            onPress={toggleFollow}
            disabled={busy}
            activeOpacity={0.85}
          >
            <Ionicons
              name={profile.is_following ? 'checkmark' : 'person-add'}
              size={16}
              color={profile.is_following ? c.primary : '#fff'}
            />
            <Text style={[styles.followText, profile.is_following && styles.followingText]}>
              {profile.is_following ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const makeStyles = (c: ColorScheme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, padding: SPACING.xl },
  emptyTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: c.text, marginTop: SPACING.sm },
  emptyText: { fontSize: FONT_SIZE.sm, color: c.textSecondary, textAlign: 'center' },

  hero: { alignItems: 'center', paddingTop: SPACING.xl, paddingHorizontal: SPACING.xl },
  avatar: {
    width: 88, height: 88, borderRadius: 28, backgroundColor: c.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md, ...SHADOW.primary,
  },
  avatarText: { fontSize: 36, fontWeight: '800', color: '#fff' },
  name: { fontSize: FONT_SIZE.xxl, fontWeight: '800', color: c.text, letterSpacing: -0.5 },

  counts: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.white, borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl,
    marginTop: SPACING.lg, marginBottom: SPACING.lg, ...SHADOW.sm,
  },
  count: { alignItems: 'center', minWidth: 80 },
  countValue: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: c.text },
  countLabel: { fontSize: FONT_SIZE.xs, color: c.textTertiary, marginTop: 2 },
  countDivider: { width: 1, height: 32, backgroundColor: c.border, marginHorizontal: SPACING.lg },

  followBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: c.primary, borderRadius: BORDER_RADIUS.md,
    paddingVertical: 12, paddingHorizontal: SPACING.xl, minWidth: 160,
    ...SHADOW.primary,
  },
  followingBtn: { backgroundColor: c.white, borderWidth: 1.5, borderColor: c.primary, shadowOpacity: 0 },
  followText: { color: '#fff', fontSize: FONT_SIZE.md, fontWeight: '700' },
  followingText: { color: c.primary },

  meBadge: { backgroundColor: c.surfaceAlt, borderRadius: BORDER_RADIUS.full, paddingVertical: 10, paddingHorizontal: SPACING.xl },
  meText: { fontSize: FONT_SIZE.sm, color: c.textSecondary, fontWeight: '600' },
});
