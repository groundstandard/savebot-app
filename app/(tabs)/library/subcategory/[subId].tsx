import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../../src/lib/supabase';
import { useColors } from '../../../../src/hooks/useColors';
import { SavedItemRow } from '../../../../src/components/library/SavedItemRow';
import { SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW, TAB_BAR_HEIGHT, type ColorScheme } from '../../../../src/constants';
import type { SavedItem } from '../../../../src/types';

export default function SubcategoryScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { subId, name } = useLocalSearchParams<{ subId: string; name: string }>();
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('saved_items')
      .select('*, media:saved_item_media(*), category:categories(*), subcategory:subcategories(*)')
      .eq('subcategory_id', subId)
      .eq('is_archived', false)
      .order('created_at', { ascending: false });
    setItems((data as SavedItem[]) ?? []);
    setLoading(false);
  }, [subId]);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={c.primary} />}
        ListHeaderComponent={
          <View>
            <View style={styles.topBar}>
              <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={20} color={c.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.header}>
              <Text style={styles.subLabel}>Subcategory</Text>
              <Text style={styles.subName}>{name}</Text>
              <View style={styles.countBadge}>
                <Ionicons name="bookmark" size={12} color={c.primary} />
                <Text style={styles.countText}>{items.length} saves</Text>
              </View>
            </View>
            {loading && <ActivityIndicator color={c.primary} style={{ marginVertical: SPACING.xl }} />}
          </View>
        }
        renderItem={({ item }) => <SavedItemRow item={item} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="pricetag-outline" size={36} color={c.textTertiary} />
              </View>
              <Text style={styles.emptyTitle}>Nothing in this subcategory</Text>
              <Text style={styles.emptyText}>Tag a save with this subcategory and it'll show up here.</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const makeStyles = (c: ColorScheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  list: { paddingBottom: TAB_BAR_HEIGHT + 16, paddingHorizontal: SPACING.md },
  topBar: { paddingTop: Platform.OS === 'ios' ? 56 : 44, marginBottom: SPACING.sm },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: c.white, alignItems: 'center', justifyContent: 'center', ...SHADOW.sm,
  },
  header: { marginBottom: SPACING.lg, gap: 6 },
  subLabel: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: c.textTertiary, letterSpacing: 1, textTransform: 'uppercase' },
  subName: { fontSize: 28, fontWeight: '800', color: c.text, letterSpacing: -0.5 },
  countBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    backgroundColor: c.white, borderRadius: BORDER_RADIUS.full,
    paddingVertical: 5, paddingHorizontal: 12, ...SHADOW.sm,
  },
  countText: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: c.text },
  empty: { alignItems: 'center', paddingTop: SPACING.xxl, paddingHorizontal: SPACING.xl, gap: SPACING.sm },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 22, backgroundColor: c.surfaceAlt,
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm,
  },
  emptyTitle: { fontSize: FONT_SIZE.xl, fontWeight: '700', color: c.text },
  emptyText: { fontSize: FONT_SIZE.sm, color: c.textSecondary, textAlign: 'center', lineHeight: 20 },
});
