import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, ScrollView, RefreshControl, Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLibraryStore } from '../../../src/store/library';
import { useColors } from '../../../src/hooks/useColors';
import { SavedItemRow } from '../../../src/components/library/SavedItemRow';
import { ConfirmModal } from '../../../src/components/ConfirmModal';
import { SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW, TAB_BAR_HEIGHT, type ColorScheme } from '../../../src/constants';

export default function CategoryScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { categoryId, name } = useLocalSearchParams<{ categoryId: string; name: string }>();
  const {
    items, loading, fetchItems,
    subcategories, fetchSubcategories, createSubcategory, renameSubcategory, deleteSubcategory, mergeSubcategory,
  } = useLibraryStore();

  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [managing, setManaging] = useState(false);
  const [newSub, setNewSub] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    fetchItems(categoryId);
    fetchSubcategories(categoryId);
  }, [categoryId]);

  const categoryItems = items.filter((i) => i.category_id === categoryId);
  const visibleItems = selectedSub
    ? categoryItems.filter((i) => i.subcategory_id === selectedSub)
    : categoryItems;

  async function handleAddSub() {
    const trimmed = newSub.trim();
    if (!trimmed) return;
    await createSubcategory(categoryId, trimmed);
    setNewSub('');
  }

  async function handleRename(id: string) {
    if (editName.trim()) await renameSubcategory(id, editName.trim());
    setEditingId(null);
    setEditName('');
  }

  function promptMergeSub(id: string, subName: string) {
    const targets = subcategories.filter((s) => s.id !== id);
    if (targets.length === 0) {
      Alert.alert('Nothing to merge into', 'Add another subcategory first.');
      return;
    }
    Alert.alert(
      `Merge "${subName}" into…`,
      'All saves here move to the subcategory you pick, then this one is removed.',
      [
        ...targets.map((t) => ({
          text: t.name,
          onPress: () => {
            mergeSubcategory(id, t.id);
            if (selectedSub === id) setSelectedSub(t.id);
          },
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    deleteSubcategory(deleteTarget.id);
    if (selectedSub === deleteTarget.id) setSelectedSub(null);
    setDeleteTarget(null);
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={visibleItems}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => { fetchItems(categoryId); fetchSubcategories(categoryId); }}
            tintColor={c.primary}
          />
        }
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
                <Text style={styles.countText}>{visibleItems.length} saves</Text>
              </View>
            </View>

            {/* Subcategory filter chips */}
            {(subcategories.length > 0 || managing) && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsRow}
              >
                <TouchableOpacity
                  style={[styles.chip, !selectedSub && styles.chipActive]}
                  onPress={() => setSelectedSub(null)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, !selectedSub && styles.chipTextActive]}>All</Text>
                </TouchableOpacity>
                {subcategories.map((sub) => (
                  <TouchableOpacity
                    key={sub.id}
                    style={styles.chip}
                    onPress={() => router.push({ pathname: '/(tabs)/library/subcategory/[subId]', params: { subId: sub.id, name: sub.name } })}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.chipText}>{sub.name}</Text>
                    <Ionicons name="chevron-forward" size={12} color={c.textTertiary} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Manage subcategories toggle */}
            <TouchableOpacity
              style={styles.manageToggle}
              onPress={() => { setManaging((m) => !m); setEditingId(null); }}
              activeOpacity={0.7}
            >
              <Ionicons name={managing ? 'chevron-up' : 'options-outline'} size={15} color={c.primary} />
              <Text style={styles.manageToggleText}>
                {managing ? 'Done managing' : 'Manage subcategories'}
              </Text>
            </TouchableOpacity>

            {/* Manage panel */}
            {managing && (
              <View style={styles.managePanel}>
                {subcategories.map((sub) => (
                  <View key={sub.id} style={styles.manageRow}>
                    {editingId === sub.id ? (
                      <>
                        <TextInput
                          style={styles.manageInput}
                          value={editName}
                          onChangeText={setEditName}
                          autoFocus
                          onSubmitEditing={() => handleRename(sub.id)}
                          placeholder="Subcategory name"
                          placeholderTextColor={c.textTertiary}
                        />
                        <TouchableOpacity onPress={() => handleRename(sub.id)} style={styles.iconBtn}>
                          <Ionicons name="checkmark" size={18} color={c.primary} />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <Text style={styles.manageName}>{sub.name}</Text>
                        <TouchableOpacity
                          onPress={() => { setEditingId(sub.id); setEditName(sub.name); }}
                          style={styles.iconBtn}
                        >
                          <Ionicons name="pencil" size={15} color={c.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => promptMergeSub(sub.id, sub.name)} style={styles.iconBtn}>
                          <Ionicons name="git-merge-outline" size={16} color={c.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setDeleteTarget({ id: sub.id, name: sub.name })} style={styles.iconBtn}>
                          <Ionicons name="trash-outline" size={15} color="#EF4444" />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                ))}
                {/* Add new subcategory */}
                <View style={styles.manageRow}>
                  <TextInput
                    style={styles.manageInput}
                    value={newSub}
                    onChangeText={setNewSub}
                    placeholder="New subcategory…"
                    placeholderTextColor={c.textTertiary}
                    onSubmitEditing={handleAddSub}
                    returnKeyType="done"
                  />
                  <TouchableOpacity onPress={handleAddSub} style={styles.iconBtn}>
                    <Ionicons name="add-circle" size={22} color={c.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

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
              <Text style={styles.emptyTitle}>
                {selectedSub ? 'Nothing in this subcategory' : 'Nothing here yet'}
              </Text>
              <Text style={styles.emptyText}>
                {selectedSub
                  ? 'Tag a save with this subcategory and it\'ll show up here.'
                  : 'Save something and it\'ll appear in this category.'}
              </Text>
            </View>
          ) : null
        }
      />

      <ConfirmModal
        visible={!!deleteTarget}
        danger
        title={`Delete "${deleteTarget?.name ?? ''}"?`}
        message="Saves stay in this category — they just lose this subcategory tag."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </View>
  );
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

  // Subcategory filter chips
  chipsRow: { gap: SPACING.xs, paddingVertical: SPACING.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: c.white,
    borderWidth: 1.5,
    borderColor: c.border,
    borderRadius: BORDER_RADIUS.full,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  chipActive: { backgroundColor: c.primary, borderColor: c.primary },
  chipText: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: c.text },
  chipTextActive: { color: c.white },

  // Manage subcategories
  manageToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  manageToggleText: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: c.primary },
  managePanel: {
    backgroundColor: c.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
    ...SHADOW.sm,
  },
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: 6,
    paddingHorizontal: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  manageName: { flex: 1, fontSize: FONT_SIZE.md, color: c.text, fontWeight: '500' },
  manageInput: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    color: c.text,
    paddingVertical: 4,
  },
  iconBtn: { padding: 6 },

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
