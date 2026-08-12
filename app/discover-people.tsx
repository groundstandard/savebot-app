import { useState, useMemo, useRef } from 'react';
import {
  View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { searchPublicUsers, type PublicUser } from '../src/lib/api/social';
import { useColors } from '../src/hooks/useColors';
import { SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW, type ColorScheme } from '../src/constants';

export default function DiscoverPeople() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onChange(text: string) {
    setQuery(text);
    if (debounce.current) clearTimeout(debounce.current);
    if (text.trim().length < 2) { setResults([]); setSearched(false); return; }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      setResults(await searchPublicUsers(text));
      setSearched(true);
      setLoading(false);
    }, 300);
  }

  return (
    <View style={styles.root}>
      <ScreenHeader title="Find people" />
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={c.textTertiary} />
          <TextInput
            style={styles.input}
            placeholder="Search by name…"
            placeholderTextColor={c.textTertiary}
            value={query}
            onChangeText={onChange}
            autoCapitalize="none"
            autoFocus
          />
          {loading ? <ActivityIndicator size="small" color={c.primary} /> : null}
        </View>
      </View>

      <FlatList
        data={results}
        keyExtractor={(u) => u.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push({ pathname: '/user/[id]', params: { id: item.id } })}
            activeOpacity={0.8}
          >
            <View style={styles.avatar}><Text style={styles.avatarText}>{item.display_name?.[0]?.toUpperCase() ?? '?'}</Text></View>
            <Text style={styles.name}>{item.display_name ?? 'User'}</Text>
            <Ionicons name="chevron-forward" size={16} color={c.textTertiary} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name={searched ? 'people-outline' : 'search-outline'} size={40} color={c.textTertiary} />
              <Text style={styles.emptyText}>
                {searched ? 'No public profiles match that name.' : 'Search for people with public profiles to follow.'}
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const makeStyles = (c: ColorScheme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  searchWrap: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, paddingBottom: SPACING.xs },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: c.white, borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md, paddingVertical: 12,
    borderWidth: 1.5, borderColor: c.border, ...SHADOW.sm,
  },
  input: { flex: 1, fontSize: FONT_SIZE.md, color: c.text },

  list: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: c.white, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOW.sm,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 14, backgroundColor: c.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: FONT_SIZE.md, fontWeight: '800', color: '#fff' },
  name: { flex: 1, fontSize: FONT_SIZE.md, fontWeight: '600', color: c.text },

  empty: { alignItems: 'center', paddingTop: SPACING.xxl, gap: SPACING.md, paddingHorizontal: SPACING.xl },
  emptyText: { fontSize: FONT_SIZE.sm, color: c.textSecondary, textAlign: 'center' },
});
