import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLibraryStore } from '../../../src/store/library';
import { useAuthStore } from '../../../src/store/auth';
import { useColors } from '../../../src/hooks/useColors';
import { SavedItemRow } from '../../../src/components/library/SavedItemRow';
import { SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW, TAB_BAR_HEIGHT, type ColorScheme } from '../../../src/constants';

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

type LibraryView = 'categories' | 'recent' | 'favorites';
type Layout = 'grid' | 'list';

const TABS: { key: LibraryView; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'categories', label: 'Categories', icon: 'albums-outline' },
  { key: 'recent', label: 'Recent', icon: 'time-outline' },
  { key: 'favorites', label: 'Favorites', icon: 'heart-outline' },
];

export default function LibraryScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { categories, loading, fetchCategories, fetchItems, items } = useLibraryStore();
  const { user } = useAuthStore();

  const [view, setView] = useState<LibraryView>('categories');
  const [layout, setLayout] = useState<Layout>('grid');

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

  if (loading && categories.length === 0 && items.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={c.primary} size="large" />
      </View>
    );
  }

  const favorites = items.filter((i) => i.is_favorite);
  const gridCategories = view === 'categories' && layout === 'grid';

  // Data + column count per active view.
  const data = view === 'categories' ? categories : view === 'favorites' ? favorites : items;
  const numColumns = gridCategories ? 2 : 1;

  const emptyCopy: Record<LibraryView, { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }> = {
    categories: { icon: 'albums-outline', title: 'No categories yet', text: 'Categories help you organize what you save. Add one to get started.' },
    recent: { icon: 'bookmark-outline', title: 'Nothing saved yet', text: 'Tap the + button to add your first save, or share from any app.' },
    favorites: { icon: 'heart-outline', title: 'No favorites yet', text: 'Tap the heart on any save to keep it here for quick access.' },
  };

  return (
    <View style={styles.container}>
      <FlatList
        // Remount when column count changes (numColumns can't change in place).
        key={`${view}-${layout}`}
        data={data as any[]}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        columnWrapperStyle={gridCategories ? styles.row : undefined}
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
                  <Ionicons name="settings-outline" size={20} color={c.text} />
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
                <Text style={styles.statText}>{favorites.length} favorites</Text>
              </View>
            </View>

            {/* Segmented tabs */}
            <View style={styles.tabs}>
              {TABS.map((t) => {
                const active = view === t.key;
                return (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.tab, active && styles.tabActive]}
                    onPress={() => setView(t.key)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={t.icon} size={15} color={active ? c.white : c.textSecondary} />
                    <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Section label + grid/list toggle (Categories only) */}
            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>
                {view === 'categories' ? 'Categories' : view === 'recent' ? 'Recently saved' : 'Your favorites'}
              </Text>
              {view === 'categories' && (
                <TouchableOpacity
                  style={styles.layoutToggle}
                  onPress={() => setLayout((l) => (l === 'grid' ? 'list' : 'grid'))}
                  activeOpacity={0.8}
                >
                  <Ionicons name={layout === 'grid' ? 'list-outline' : 'grid-outline'} size={18} color={c.text} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        }
        renderItem={({ item, index }) => {
          if (view === 'categories') {
            const cat = item;
            const count = items.filter((i) => i.category_id === cat.id).length;
            const palette = CATEGORY_COLORS[index % CATEGORY_COLORS.length];

            if (layout === 'list') {
              return (
                <TouchableOpacity
                  style={styles.listCard}
                  onPress={() => router.push({ pathname: '/(tabs)/library/[categoryId]', params: { categoryId: cat.id, name: cat.name } })}
                  activeOpacity={0.85}
                >
                  <View style={[styles.listIconBubble, { backgroundColor: palette.bg }]}>
                    <Text style={styles.cardEmoji}>{cat.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listCardName} numberOfLines={1}>{cat.name}</Text>
                    <Text style={styles.cardCount}>{count} saves</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={c.textTertiary} />
                </TouchableOpacity>
              );
            }

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
          }

          // Recent / Favorites → saved item card
          return <SavedItemRow item={item} />;
        }}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name={emptyCopy[view].icon} size={40} color={c.textTertiary} />
              </View>
              <Text style={styles.emptyTitle}>{emptyCopy[view].title}</Text>
              <Text style={styles.emptyText}>{emptyCopy[view].text}</Text>
            </View>
          ) : null
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

  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  statPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: c.white, borderRadius: BORDER_RADIUS.full,
    paddingVertical: 8, paddingHorizontal: SPACING.md,
    ...SHADOW.sm,
  },
  statText: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: c.text },

  tabs: {
    flexDirection: 'row',
    backgroundColor: c.surfaceAlt,
    borderRadius: BORDER_RADIUS.full,
    padding: 4,
    marginBottom: SPACING.lg,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.full,
  },
  tabActive: { backgroundColor: c.primary, ...SHADOW.sm },
  tabText: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: c.textSecondary },
  tabTextActive: { color: c.white },

  sectionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  sectionLabel: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: c.textTertiary, letterSpacing: 1, textTransform: 'uppercase' },
  layoutToggle: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: c.white, alignItems: 'center', justifyContent: 'center',
    ...SHADOW.sm,
  },

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

  // List-view category row
  listCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: c.white, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.sm,
    ...SHADOW.sm,
  },
  listIconBubble: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  listCardName: { fontSize: FONT_SIZE.md, fontWeight: '700', color: c.text, marginBottom: 2 },

  empty: { alignItems: 'center', paddingTop: SPACING.xxl, paddingHorizontal: SPACING.xl },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: c.text, marginBottom: SPACING.sm },
  emptyText: { fontSize: FONT_SIZE.sm, color: c.textSecondary, textAlign: 'center', lineHeight: 20 },
});
