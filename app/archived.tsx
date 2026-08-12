import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { ConfirmModal } from '../src/components/ConfirmModal';
import { supabase } from '../src/lib/supabase';
import { unarchiveItem, deleteItem } from '../src/lib/api/saveItem';
import { useLibraryStore } from '../src/store/library';
import { tapFeedback, warnFeedback } from '../src/lib/haptics';
import { useColors } from '../src/hooks/useColors';
import { SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW, type ColorScheme } from '../src/constants';
import type { SavedItem } from '../src/types';

export default function ArchivedScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const addItem = useLibraryStore((s) => s.addItem);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('saved_items')
      .select('*, category:categories(*)')
      .eq('is_archived', true)
      .order('created_at', { ascending: false });
    setItems((data as SavedItem[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleRestore(item: SavedItem) {
    tapFeedback();
    setItems((list) => list.filter((i) => i.id !== item.id));
    addItem({ ...item, is_archived: false }); // reappears in the library
    await unarchiveItem(item.id);
  }

  async function handleDelete() {
    if (!confirmId) return;
    warnFeedback();
    const id = confirmId;
    setConfirmId(null);
    setItems((list) => list.filter((i) => i.id !== id));
    await deleteItem(id);
  }

  return (
    <View style={styles.root}>
      <ScreenHeader title="Archived" />
      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={c.primary} size="large" /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.cardBody}
                onPress={() => router.push({ pathname: '/item/[id]', params: { id: item.id } })}
                activeOpacity={0.8}
              >
                <Text style={styles.summary} numberOfLines={2}>
                  {item.ai_summary ?? item.raw_caption ?? 'Untitled save'}
                </Text>
                <Text style={styles.meta}>{new Date(item.created_at).toLocaleDateString()}</Text>
              </TouchableOpacity>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleRestore(item)} activeOpacity={0.7}>
                  <Ionicons name="arrow-undo-outline" size={18} color={c.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => setConfirmId(item.id)} activeOpacity={0.7}>
                  <Ionicons name="trash-outline" size={18} color={c.danger} />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="archive-outline" size={44} color={c.textTertiary} />
              <Text style={styles.emptyTitle}>Nothing archived</Text>
              <Text style={styles.emptyText}>Items you archive from a save will show up here — restore or delete them anytime.</Text>
            </View>
          }
        />
      )}

      <ConfirmModal
        visible={!!confirmId}
        danger
        title="Delete permanently?"
        message="This removes the item from your library for good."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
      />
    </View>
  );
}

const makeStyles = (c: ColorScheme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: SPACING.md, flexGrow: 1 },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.white, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOW.sm,
  },
  cardBody: { flex: 1, paddingRight: SPACING.sm },
  summary: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: c.text, lineHeight: 19 },
  meta: { fontSize: FONT_SIZE.xs, color: c.textTertiary, marginTop: 4 },
  actions: { flexDirection: 'row', gap: SPACING.xs },
  actionBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: c.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.xl, paddingTop: SPACING.xxl },
  emptyTitle: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: c.text, marginTop: SPACING.sm },
  emptyText: { fontSize: FONT_SIZE.sm, color: c.textSecondary, textAlign: 'center' },
});
