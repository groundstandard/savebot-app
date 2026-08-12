import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Linking, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { getFollowingFeed, type FeedItem } from '../src/lib/api/social';
import { useColors } from '../src/hooks/useColors';
import { SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW, type ColorScheme } from '../src/constants';

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24); if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

export default function FeedScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setItems(await getFollowingFeed());
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openItem(item: FeedItem) {
    if (item.source_url) Linking.openURL(item.source_url).catch(() => {});
  }

  return (
    <View style={styles.root}>
      <ScreenHeader title="Following" />
      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={c.primary} size="large" /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.primary} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => openItem(item)} activeOpacity={0.85}>
              <View style={styles.cardHead}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{item.author_name?.[0]?.toUpperCase() ?? '?'}</Text></View>
                <TouchableOpacity onPress={() => router.push({ pathname: '/user/[id]', params: { id: item.user_id } })}>
                  <Text style={styles.author}>{item.author_name ?? 'User'}</Text>
                </TouchableOpacity>
                <Text style={styles.dot}>·</Text>
                <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
              </View>
              <Text style={styles.summary} numberOfLines={3}>
                {item.ai_summary ?? item.raw_caption ?? 'A saved item'}
              </Text>
              <View style={styles.metaRow}>
                {item.content_classification ? <Text style={styles.tag}>{item.content_classification}</Text> : null}
                {item.source_platform ? <Text style={styles.platform}>{item.source_platform}</Text> : null}
                {item.source_url ? <Ionicons name="open-outline" size={13} color={c.textTertiary} style={{ marginLeft: 'auto' }} /> : null}
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={44} color={c.textTertiary} />
              <Text style={styles.emptyTitle}>Your feed is empty</Text>
              <Text style={styles.emptyText}>Follow people to see the saves they've shared publicly.</Text>
              <TouchableOpacity style={styles.findBtn} onPress={() => router.push('/discover-people')} activeOpacity={0.85}>
                <Ionicons name="search" size={16} color="#fff" />
                <Text style={styles.findText}>Find people</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const makeStyles = (c: ColorScheme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: SPACING.md, flexGrow: 1 },

  card: { backgroundColor: c.white, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOW.sm },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.sm },
  avatar: { width: 30, height: 30, borderRadius: 10, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  avatarText: { fontSize: FONT_SIZE.sm, fontWeight: '800', color: '#fff' },
  author: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: c.text },
  dot: { color: c.textTertiary },
  time: { fontSize: FONT_SIZE.xs, color: c.textTertiary },

  summary: { fontSize: FONT_SIZE.md, color: c.text, lineHeight: 21, marginBottom: SPACING.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tag: {
    fontSize: FONT_SIZE.xs, color: c.primary, fontWeight: '700', textTransform: 'capitalize',
    backgroundColor: c.primaryLight, borderRadius: BORDER_RADIUS.full, paddingHorizontal: 8, paddingVertical: 2,
  },
  platform: { fontSize: FONT_SIZE.xs, color: c.textTertiary, textTransform: 'capitalize' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.xl, paddingTop: SPACING.xxl },
  emptyTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: c.text, marginTop: SPACING.sm },
  emptyText: { fontSize: FONT_SIZE.sm, color: c.textSecondary, textAlign: 'center' },
  findBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: SPACING.md,
    backgroundColor: c.primary, borderRadius: BORDER_RADIUS.md, paddingVertical: 12, paddingHorizontal: SPACING.xl, ...SHADOW.primary,
  },
  findText: { color: '#fff', fontSize: FONT_SIZE.md, fontWeight: '700' },
});
