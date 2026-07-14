import { useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLibraryStore } from '../../../src/store/library';
import { useColors } from '../../../src/hooks/useColors';
import { SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW, TAB_BAR_HEIGHT, type ColorScheme } from '../../../src/constants';
import type { SavedItem } from '../../../src/types';

export default function CategoryScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { categoryId, name } = useLocalSearchParams<{ categoryId: string; name: string }>();
  const { items, loading, fetchItems } = useLibraryStore();

  useEffect(() => { fetchItems(categoryId); }, [categoryId]);

  const categoryItems = items.filter((i) => i.category_id === categoryId);

  return (
    <View style={styles.container}>
      <FlatList
        data={categoryItems}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Top bar */}
            <View style={styles.topBar}>
              <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={20} color={c.text} />
              </TouchableOpacity>
            </View>

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.categoryName}>{name}</Text>
              <View style={styles.countBadge}>
                <Ionicons name="bookmark" size={12} color={c.primary} />
                <Text style={styles.countText}>{categoryItems.length} saves</Text>
              </View>
            </View>

            {loading && (
              <ActivityIndicator color={c.primary} style={{ marginVertical: SPACING.xl }} />
            )}
          </View>
        }
        renderItem={({ item }) => <SavedItemRow item={item} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="folder-open-outline" size={36} color={c.textTertiary} />
              </View>
              <Text style={styles.emptyTitle}>Nothing here yet</Text>
              <Text style={styles.emptyText}>Save something and it'll appear in this category.</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

function SavedItemRow({ item }: { item: SavedItem }) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push({ pathname: '/item/[id]', params: { id: item.id } })}
      activeOpacity={0.85}
    >
      <View style={styles.cardTop}>
        <View style={styles.platformBadge}>
          <Text style={styles.platformEmoji}>{platformEmoji(item.source_platform)}</Text>
        </View>
        <View style={styles.cardMeta}>
          <Text style={styles.cardPlatform}>{item.source_platform ?? 'Manual'}</Text>
          <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
        </View>
        {item.is_favorite && (
          <Ionicons name="heart" size={14} color="#EC4899" />
        )}
      </View>

      <Text style={styles.cardSummary} numberOfLines={3}>
        {item.ai_summary ?? item.raw_caption ?? 'Processing…'}
      </Text>

      {item.ai_tags.length > 0 && (
        <View style={styles.tags}>
          {item.ai_tags.slice(0, 3).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.viewText}>View details</Text>
        <Ionicons name="chevron-forward" size={13} color={c.textTertiary} />
      </View>
    </TouchableOpacity>
  );
}

function platformEmoji(platform: string) {
  const map: Record<string, string> = {
    instagram: '📸', tiktok: '🎵', youtube: '▶️', facebook: '👥', x: '🐦', manual: '✏️',
  };
  return map[platform] ?? '🌐';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const makeStyles = (c: ColorScheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  list: { paddingBottom: TAB_BAR_HEIGHT + 16, paddingHorizontal: SPACING.md },

  topBar: {
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    marginBottom: SPACING.sm,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: c.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.sm,
  },

  header: {
    marginBottom: SPACING.lg,
    gap: 8,
  },
  categoryName: {
    fontSize: 28,
    fontWeight: '800',
    color: c.text,
    letterSpacing: -0.5,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: c.white,
    borderRadius: BORDER_RADIUS.full,
    paddingVertical: 5,
    paddingHorizontal: 12,
    ...SHADOW.sm,
  },
  countText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    color: c.text,
  },

  card: {
    backgroundColor: c.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOW.sm,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  platformBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: c.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformEmoji: { fontSize: 16 },
  cardMeta: { flex: 1 },
  cardPlatform: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
    color: c.primary,
    textTransform: 'capitalize',
  },
  cardDate: { fontSize: FONT_SIZE.xs, color: c.textTertiary, marginTop: 1 },

  cardSummary: {
    fontSize: FONT_SIZE.sm,
    color: c.text,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },

  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: SPACING.sm },
  tag: {
    backgroundColor: c.primaryLight,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: { fontSize: FONT_SIZE.xs, color: c.primary, fontWeight: '600' },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  viewText: { fontSize: FONT_SIZE.xs, color: c.textTertiary, fontWeight: '500' },

  empty: {
    alignItems: 'center',
    paddingTop: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: c.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  emptyTitle: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: c.text },
  emptyText: {
    fontSize: FONT_SIZE.sm,
    color: c.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
