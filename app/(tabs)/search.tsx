import { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW, TAB_BAR_HEIGHT } from '../../src/constants';
import type { SavedItem } from '../../src/types';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  async function handleSearch(text: string) {
    setQuery(text);
    if (text.length < 2) { setResults([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from('saved_items')
      .select('*, category:categories(*)')
      .or(`ai_summary.ilike.%${text}%,raw_caption.ilike.%${text}%`)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
      .limit(30);
    setResults((data as SavedItem[]) ?? []);
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
        <Text style={styles.subtitle}>Find anything in your library</Text>
        <View style={[styles.searchBar, focused && styles.searchBarFocused]}>
          <Ionicons name="search" size={18} color={focused ? COLORS.primary : COLORS.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Recipes, workouts, ideas…"
            placeholderTextColor={COLORS.textTertiary}
            value={query}
            onChangeText={handleSearch}
            returnKeyType="search"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
          {loading
            ? <ActivityIndicator size="small" color={COLORS.primary} />
            : query.length > 0
              ? <TouchableOpacity onPress={() => { setQuery(''); setResults([]); }}>
                  <Ionicons name="close-circle" size={18} color={COLORS.textTertiary} />
                </TouchableOpacity>
              : null
          }
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.result}
            onPress={() => router.push({ pathname: '/item/[id]', params: { id: item.id } })}
            activeOpacity={0.85}
          >
            <View style={styles.resultLeft}>
              <View style={styles.resultIcon}>
                <Ionicons name="bookmark" size={16} color={COLORS.primary} />
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
            <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          query.length >= 2
            ? (
              <View style={styles.empty}>
                <Ionicons name="search-outline" size={40} color={COLORS.textTertiary} />
                <Text style={styles.emptyTitle}>No results</Text>
                <Text style={styles.emptyText}>Nothing matches "{query}"</Text>
              </View>
            )
            : query.length === 0
              ? (
                <View style={styles.empty}>
                  <Ionicons name="sparkles-outline" size={40} color={COLORS.textTertiary} />
                  <Text style={styles.emptyTitle}>Search your saves</Text>
                  <Text style={styles.emptyText}>Find recipes, workouts, ideas and more</Text>
                </View>
              )
              : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background,
  },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  subtitle: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 2, marginBottom: SPACING.md },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md, paddingVertical: 12,
    borderWidth: 1.5, borderColor: COLORS.border,
    ...SHADOW.sm,
  },
  searchBarFocused: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  searchInput: { flex: 1, fontSize: FONT_SIZE.md, color: COLORS.text },

  list: { paddingHorizontal: SPACING.md, paddingBottom: TAB_BAR_HEIGHT + 16, paddingTop: SPACING.sm },

  result: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.sm,
    ...SHADOW.sm,
  },
  resultLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  resultIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  resultBody: { flex: 1 },
  resultSummary: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.text, marginBottom: 4, lineHeight: 18 },
  resultMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  resultCategory: { fontSize: FONT_SIZE.xs, color: COLORS.primary, fontWeight: '600' },
  resultDot: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },
  resultDate: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary },

  empty: { alignItems: 'center', paddingTop: SPACING.xxl, gap: SPACING.md },
  emptyTitle: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: COLORS.text },
  emptyText: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, textAlign: 'center' },
});
