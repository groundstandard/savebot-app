import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, FlatList, ScrollView,
  TouchableOpacity, ActivityIndicator, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../src/lib/supabase';
import { useLibraryStore } from '../../src/store/library';
import { useColors } from '../../src/hooks/useColors';
import { SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW, TAB_BAR_HEIGHT, type ColorScheme } from '../../src/constants';
import type { SavedItem } from '../../src/types';

const RECENTS_KEY = 'savebot.recentSearches';

const TYPE_FILTERS = [
  { key: 'recipe', label: 'Recipes' },
  { key: 'workout', label: 'Workouts' },
  { key: 'travel', label: 'Travel' },
  { key: 'product', label: 'Products' },
] as const;

const PLATFORM_FILTERS = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'x', label: 'X' },
  { key: 'manual', label: 'Manual' },
] as const;

const DATE_FILTERS = [
  { key: 'all', label: 'All time' },
  { key: 'week', label: 'Past week' },
  { key: 'month', label: 'Past month' },
] as const;
type DateKey = (typeof DATE_FILTERS)[number]['key'];

export default function SearchScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);

  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateKey>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const { categories, fetchCategories } = useLibraryStore();

  const hasFilters = !!typeFilter || !!platformFilter || !!categoryFilter || dateFilter !== 'all';
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load recent searches + categories once.
  useEffect(() => {
    AsyncStorage.getItem(RECENTS_KEY).then((v) => {
      if (v) { try { setRecents(JSON.parse(v)); } catch { /* ignore */ } }
    });
    if (categories.length === 0) fetchCategories();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const runSearch = useCallback(async (text: string) => {
    const q = text.trim();
    const active = !!typeFilter || !!platformFilter || !!categoryFilter || dateFilter !== 'all';
    if (q.length < 2 && !active) { setResults([]); return; }
    setLoading(true);

    // Build the base query with the active filters applied.
    const base = () => {
      let b = supabase.from('saved_items').select('*, category:categories(*)').eq('is_archived', false);
      if (typeFilter) b = b.eq('content_classification', typeFilter);
      if (platformFilter) b = b.eq('source_platform', platformFilter);
      if (categoryFilter) b = b.eq('category_id', categoryFilter);
      if (dateFilter !== 'all') {
        const days = dateFilter === 'week' ? 7 : 30;
        b = b.gte('created_at', new Date(Date.now() - days * 86400000).toISOString());
      }
      return b;
    };

    let data: SavedItem[] | null = null;
    if (q.length >= 2) {
      // Ranked full-text first; falls back to ILIKE if the fts column isn't
      // there yet (migration 003 not applied), so search always works.
      const r1 = await base()
        .textSearch('fts', q, { type: 'websearch' })
        .order('created_at', { ascending: false })
        .limit(30);
      if (r1.error) {
        const safe = q.replace(/[%,]/g, ' ');
        const r2 = await base()
          .or(`ai_summary.ilike.%${safe}%,raw_caption.ilike.%${safe}%,user_notes.ilike.%${safe}%`)
          .order('created_at', { ascending: false })
          .limit(30);
        data = (r2.data as SavedItem[]) ?? null;
      } else {
        data = (r1.data as SavedItem[]) ?? null;
      }
    } else {
      // Filters only, no text query.
      const r = await base().order('created_at', { ascending: false }).limit(30);
      data = (r.data as SavedItem[]) ?? null;
    }

    setResults(data ?? []);
    setLoading(false);
  }, [typeFilter, platformFilter, categoryFilter, dateFilter]);

  // Re-run whenever a filter changes.
  useEffect(() => { runSearch(query); }, [typeFilter, platformFilter, categoryFilter, dateFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  function onChangeText(text: string) {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(text), 300);
  }

  async function saveRecent(text: string) {
    const t = text.trim();
    if (t.length < 2) return;
    const next = [t, ...recents.filter((r) => r.toLowerCase() !== t.toLowerCase())].slice(0, 8);
    setRecents(next);
    await AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  }

  async function clearRecents() {
    setRecents([]);
    await AsyncStorage.removeItem(RECENTS_KEY);
  }

  function pickRecent(text: string) {
    setQuery(text);
    runSearch(text);
  }

  const chip = (label: string, active: boolean, onPress: () => void, key: string) => (
    <TouchableOpacity key={key} style={[styles.chip, active && styles.chipActive]} onPress={onPress} activeOpacity={0.8}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  const showRecents = query.trim().length < 2 && !hasFilters;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
        <Text style={styles.subtitle}>Find anything in your library</Text>
        <View style={[styles.searchBar, focused && styles.searchBarFocused]}>
          <Ionicons name="search" size={18} color={focused ? c.primary : c.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Recipes, workouts, ideas…"
            placeholderTextColor={c.textTertiary}
            value={query}
            onChangeText={onChangeText}
            onSubmitEditing={() => saveRecent(query)}
            returnKeyType="search"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
          {loading
            ? <ActivityIndicator size="small" color={c.primary} />
            : query.length > 0
              ? <TouchableOpacity onPress={() => { setQuery(''); setResults([]); }}>
                  <Ionicons name="close-circle" size={18} color={c.textTertiary} />
                </TouchableOpacity>
              : null}
        </View>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow} keyboardShouldPersistTaps="handled">
          {categories.length > 0 && (
            <>
              {categories.map((cat) => chip(cat.name, categoryFilter === cat.id, () => setCategoryFilter((p) => (p === cat.id ? null : cat.id)), `c-${cat.id}`))}
              <View style={styles.chipDivider} />
            </>
          )}
          {TYPE_FILTERS.map((f) => chip(f.label, typeFilter === f.key, () => setTypeFilter((p) => (p === f.key ? null : f.key)), `t-${f.key}`))}
          <View style={styles.chipDivider} />
          {PLATFORM_FILTERS.map((f) => chip(f.label, platformFilter === f.key, () => setPlatformFilter((p) => (p === f.key ? null : f.key)), `p-${f.key}`))}
          <View style={styles.chipDivider} />
          {DATE_FILTERS.map((f) => chip(f.label, dateFilter === f.key, () => setDateFilter(f.key), `d-${f.key}`))}
        </ScrollView>
      </View>

      <FlatList
        data={results}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.result}
            onPress={() => router.push({ pathname: '/item/[id]', params: { id: item.id } })}
            activeOpacity={0.85}
          >
            <View style={styles.resultLeft}>
              <View style={styles.resultIcon}>
                <Ionicons name="bookmark" size={16} color={c.primary} />
              </View>
              <View style={styles.resultBody}>
                <Text style={styles.resultSummary} numberOfLines={2}>
                  {item.ai_summary ?? item.raw_caption ?? '—'}
                </Text>
                <View style={styles.resultMeta}>
                  <Text style={styles.resultCategory}>{item.category?.name ?? 'Uncategorized'}</Text>
                  <Text style={styles.resultDot}>·</Text>
                  <Text style={styles.resultDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                </View>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={c.textTertiary} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          showRecents
            ? (
              <View style={styles.recentsWrap}>
                {recents.length > 0 ? (
                  <>
                    <View style={styles.recentsHead}>
                      <Text style={styles.recentsTitle}>Recent</Text>
                      <TouchableOpacity onPress={clearRecents}><Text style={styles.recentsClear}>Clear</Text></TouchableOpacity>
                    </View>
                    {recents.map((r) => (
                      <TouchableOpacity key={r} style={styles.recentRow} onPress={() => pickRecent(r)} activeOpacity={0.7}>
                        <Ionicons name="time-outline" size={16} color={c.textTertiary} />
                        <Text style={styles.recentText}>{r}</Text>
                        <Ionicons name="arrow-up-outline" size={14} color={c.textTertiary} style={{ transform: [{ rotate: '45deg' }] }} />
                      </TouchableOpacity>
                    ))}
                  </>
                ) : (
                  <View style={styles.empty}>
                    <Ionicons name="sparkles-outline" size={40} color={c.textTertiary} />
                    <Text style={styles.emptyTitle}>Search your saves</Text>
                    <Text style={styles.emptyText}>Find recipes, workouts, ideas — or filter by type, platform, or date</Text>
                  </View>
                )}
              </View>
            )
            : !loading
              ? (
                <View style={styles.empty}>
                  <Ionicons name="search-outline" size={40} color={c.textTertiary} />
                  <Text style={styles.emptyTitle}>No results</Text>
                  <Text style={styles.emptyText}>Try a different word or clear a filter</Text>
                </View>
              )
              : null
        }
      />
    </View>
  );
}

const makeStyles = (c: ColorScheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },

  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: c.background,
  },
  title: { fontSize: 28, fontWeight: '800', color: c.text, letterSpacing: -0.5 },
  subtitle: { fontSize: FONT_SIZE.sm, color: c.textSecondary, marginTop: 2, marginBottom: SPACING.md },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: c.white, borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md, paddingVertical: 12,
    borderWidth: 1.5, borderColor: c.border,
    ...SHADOW.sm,
  },
  searchBarFocused: { borderColor: c.primary, backgroundColor: c.primaryLight },
  searchInput: { flex: 1, fontSize: FONT_SIZE.md, color: c.text },

  chipRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, paddingTop: SPACING.md, paddingRight: SPACING.md },
  chip: {
    paddingHorizontal: SPACING.md, paddingVertical: 7,
    borderRadius: BORDER_RADIUS.full, backgroundColor: c.white,
    borderWidth: 1, borderColor: c.border,
  },
  chipActive: { backgroundColor: c.primary, borderColor: c.primary },
  chipText: { fontSize: FONT_SIZE.xs, fontWeight: '600', color: c.textSecondary },
  chipTextActive: { color: '#fff' },
  chipDivider: { width: 1, height: 20, backgroundColor: c.border, marginHorizontal: SPACING.xs },

  list: { paddingHorizontal: SPACING.md, paddingBottom: TAB_BAR_HEIGHT + 16, paddingTop: SPACING.sm },

  result: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.white, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.sm,
    ...SHADOW.sm,
  },
  resultLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  resultIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: c.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  resultBody: { flex: 1 },
  resultSummary: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: c.text, marginBottom: 4, lineHeight: 18 },
  resultMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resultCategory: { fontSize: FONT_SIZE.xs, color: c.primary, fontWeight: '600' },
  resultDot: { fontSize: FONT_SIZE.xs, color: c.textTertiary },
  resultDate: { fontSize: FONT_SIZE.xs, color: c.textTertiary },

  recentsWrap: { paddingTop: SPACING.sm },
  recentsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs, paddingHorizontal: 4 },
  recentsTitle: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: c.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8 },
  recentsClear: { fontSize: FONT_SIZE.xs, fontWeight: '600', color: c.primary },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border },
  recentText: { flex: 1, fontSize: FONT_SIZE.sm, color: c.text },

  empty: { alignItems: 'center', paddingTop: SPACING.xxl, gap: SPACING.md },
  emptyTitle: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: c.text },
  emptyText: { fontSize: FONT_SIZE.sm, color: c.textSecondary, textAlign: 'center', paddingHorizontal: SPACING.xl },
});
