import { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import { SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW, type ColorScheme } from '../../constants';
import type { SavedItem } from '../../types';

export function platformEmoji(platform: string | null) {
  const map: Record<string, string> = {
    instagram: '📸', tiktok: '🎵', youtube: '▶️', facebook: '👥', x: '🐦', manual: '✏️',
  };
  return map[platform ?? 'manual'] ?? '🌐';
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Shared saved-item card used by category detail, Recent, and Favorites. */
export function SavedItemRow({ item }: { item: SavedItem }) {
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
        {item.is_favorite && <Ionicons name="heart" size={14} color="#EC4899" />}
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

const makeStyles = (c: ColorScheme) => StyleSheet.create({
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
});
