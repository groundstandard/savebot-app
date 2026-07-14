import { useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLibraryStore } from '../../../src/store/library';
import { useAuthStore } from '../../../src/store/auth';
import { useColors } from '../../../src/hooks/useColors';
import { SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW, TAB_BAR_HEIGHT, type ColorScheme } from '../../../src/constants';
import type { Category } from '../../../src/types';

const CATEGORY_COLORS = [
  { bg: '#FEF3C7', icon: '#D97706' },
  { bg: '#DBEAFE', icon: '#2563EB' },
  { bg: '#D1FAE5', icon: '#059669' },
  { bg: '#FCE7F3', icon: '#DB2777' },
  { bg: '#EDE9FE', icon: '#7C3AED' },
  { bg: '#FEE2E2', icon: '#DC2626' },
  { bg: '#CFFAFE', icon: '#0891B2' },
  { bg: '#E0E7FF', icon: '#4338CA' },
  { bg: '#FEF9C3', icon: '#CA8A04' },
  { bg: '#DCFCE7', icon: '#16A34A' },
  { bg: '#F3F4F6', icon: '#6B7280' },
];

export default function LibraryScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { categories, loading, fetchCategories, fetchItems, items } = useLibraryStore();
  const { user } = useAuthStore();

  useEffect(() => {
    fetchCategories();
    fetchItems();
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading && categories.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={c.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={categories}
        keyExtractor={(c) => c.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => { fetchCategories(); fetchItems(); }}
            tintColor={c.primary}
          />
        }
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.greeting}>{greeting()}{user?.display_name ? `, ${user.display_name.split(' ')[0]}` : ''} 👋</Text>
                <Text style={styles.title}>My Library</Text>
              </View>
              <View style={styles.headerBtns}>
                <TouchableOpacity style={styles.notifBtn} onPress={() => router.push('/manage-categories' as never)}>
                  <Ionicons name="albums-outline" size={20} color={c.text} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.notifBtn}>
                  <Ionicons name="notifications-outline" size={22} color={c.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={styles.statPill}>
                <Ionicons name="bookmark" size={14} color={c.primary} />
                <Text style={styles.statText}>{items.length} saves</Text>
              </View>
              <View style={styles.statPill}>
                <Ionicons name="heart" size={14} color="#EC4899" />
                <Text style={styles.statText}>{items.filter(i => i.is_favorite).length} favorites</Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>Categories</Text>
          </View>
        }
        renderItem={({ item: cat, index }) => {
          const count = items.filter(i => i.category_id === cat.id).length;
          const palette = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push({ pathname: '/(tabs)/library/[categoryId]', params: { categoryId: cat.id, name: cat.name } })}
              activeOpacity={0.85}
            >
              <View style={[styles.iconBubble, { backgroundColor: palette.bg }]}>
                <Text style={styles.cardEmoji}>{cat.icon}</Text>
              </View>
              <Text style={styles.cardName} numberOfLines={2}>{cat.name}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.cardCount}>{count} saves</Text>
                <Ionicons name="chevron-forward" size={13} color={c.textTertiary} />
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="bookmark-outline" size={40} color={c.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>Nothing saved yet</Text>
            <Text style={styles.emptyText}>Tap the + button to add your first save, or share from any app.</Text>
          </View>
        }
      />
    </View>
  );
}

const makeStyles = (c: ColorScheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background },
  listContent: { paddingBottom: TAB_BAR_HEIGHT + 16, paddingHorizontal: SPACING.md },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingTop: Platform.OS === 'ios' ? 60 : 48, marginBottom: SPACING.md,
  },
  greeting: { fontSize: FONT_SIZE.sm, color: c.textSecondary, fontWeight: '500', marginBottom: 2 },
  title: { fontSize: 28, fontWeight: '800', color: c.text, letterSpacing: -0.5 },
  headerBtns: { flexDirection: 'row', gap: SPACING.sm },
  notifBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: c.white, alignItems: 'center', justifyContent: 'center',
    ...SHADOW.sm,
  },

  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  statPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: c.white, borderRadius: BORDER_RADIUS.full,
    paddingVertical: 8, paddingHorizontal: SPACING.md,
    ...SHADOW.sm,
  },
  statText: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: c.text },

  sectionLabel: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: c.textTertiary, letterSpacing: 1, textTransform: 'uppercase', marginBottom: SPACING.sm },

  row: { gap: SPACING.sm, marginBottom: SPACING.sm },
  card: {
    flex: 1, backgroundColor: c.white, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md, minHeight: 120,
    ...SHADOW.sm,
  },
  iconBubble: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  cardEmoji: { fontSize: 22 },
  cardName: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: c.text, flex: 1, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SPACING.xs },
  cardCount: { fontSize: FONT_SIZE.xs, color: c.textTertiary, fontWeight: '500' },

  empty: { alignItems: 'center', paddingTop: SPACING.xxl, paddingHorizontal: SPACING.xl },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: c.text, marginBottom: SPACING.sm },
  emptyText: { fontSize: FONT_SIZE.sm, color: c.textSecondary, textAlign: 'center', lineHeight: 20 },
});
