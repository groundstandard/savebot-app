import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLibraryStore } from '../src/store/library';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW } from '../src/constants';
import type { Category } from '../src/types';

const ICON_CHOICES = ['📁', '🍳', '💪', '✈️', '🏠', '👗', '🛍️', '💼', '📚', '🎬', '🎯', '💡', '🎨', '🎵', '⚽'];

export default function ManageCategoriesScreen() {
  const { categories, fetchCategories, createCategory, renameCategory, setCategoryHidden, deleteCategory } = useLibraryStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('📁');

  useEffect(() => { fetchCategories(true); }, []);

  function startEdit(c: Category) {
    setEditingId(c.id);
    setEditName(c.name);
    setConfirmDeleteId(null);
  }

  async function saveEdit(id: string) {
    if (editName.trim()) await renameCategory(id, editName.trim());
    setEditingId(null);
  }

  async function handleAdd() {
    if (!newName.trim()) return;
    await createCategory(newName.trim(), newIcon);
    setNewName('');
    setNewIcon('📁');
    setAdding(false);
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Categories</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {categories.map((c) => (
          <View key={c.id} style={styles.row}>
            <View style={styles.iconBubble}><Text style={styles.iconEmoji}>{c.icon}</Text></View>

            {editingId === c.id ? (
              <TextInput
                style={styles.editInput}
                value={editName}
                onChangeText={setEditName}
                autoFocus
                onSubmitEditing={() => saveEdit(c.id)}
                returnKeyType="done"
              />
            ) : (
              <View style={styles.rowBody}>
                <Text style={[styles.rowName, c.is_hidden && styles.rowNameHidden]}>{c.name}</Text>
                {c.is_hidden && <Text style={styles.hiddenTag}>Hidden</Text>}
              </View>
            )}

            <View style={styles.rowActions}>
              {editingId === c.id ? (
                <TouchableOpacity onPress={() => saveEdit(c.id)} style={styles.actionBtn}>
                  <Ionicons name="checkmark" size={18} color={COLORS.success} />
                </TouchableOpacity>
              ) : confirmDeleteId === c.id ? (
                <>
                  <TouchableOpacity onPress={() => { deleteCategory(c.id); setConfirmDeleteId(null); }} style={styles.actionBtn}>
                    <Ionicons name="trash" size={17} color={COLORS.danger} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setConfirmDeleteId(null)} style={styles.actionBtn}>
                    <Ionicons name="close" size={18} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity onPress={() => startEdit(c)} style={styles.actionBtn}>
                    <Ionicons name="pencil" size={16} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setCategoryHidden(c.id, !c.is_hidden)} style={styles.actionBtn}>
                    <Ionicons name={c.is_hidden ? 'eye-outline' : 'eye-off-outline'} size={17} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setConfirmDeleteId(c.id)} style={styles.actionBtn}>
                    <Ionicons name="trash-outline" size={17} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        ))}

        {/* Add new */}
        {adding ? (
          <View style={styles.addCard}>
            <View style={styles.iconPickerRow}>
              {ICON_CHOICES.map((ic) => (
                <TouchableOpacity
                  key={ic}
                  style={[styles.iconChoice, newIcon === ic && styles.iconChoiceActive]}
                  onPress={() => setNewIcon(ic)}
                >
                  <Text style={styles.iconChoiceEmoji}>{ic}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.addInput}
              placeholder="Category name"
              placeholderTextColor={COLORS.textTertiary}
              value={newName}
              onChangeText={setNewName}
              autoFocus
              onSubmitEditing={handleAdd}
              returnKeyType="done"
            />
            <View style={styles.addActions}>
              <TouchableOpacity style={styles.addBtn} onPress={handleAdd} activeOpacity={0.85}>
                <Text style={styles.addBtnText}>Add category</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setAdding(false); setNewName(''); }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.newRow} onPress={() => setAdding(true)} activeOpacity={0.85}>
            <Ionicons name="add-circle" size={22} color={COLORS.primary} />
            <Text style={styles.newRowText}>New category</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topBar: {
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', ...SHADOW.sm,
  },
  headerTitle: { fontSize: FONT_SIZE.lg, fontWeight: '800', color: COLORS.text },

  list: { padding: SPACING.md, gap: SPACING.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm, ...SHADOW.sm,
  },
  iconBubble: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  iconEmoji: { fontSize: 20 },
  rowBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  rowName: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.text },
  rowNameHidden: { color: COLORS.textTertiary },
  hiddenTag: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, fontWeight: '600' },
  editInput: {
    flex: 1, fontSize: FONT_SIZE.md, color: COLORS.text, fontWeight: '600',
    borderBottomWidth: 1.5, borderBottomColor: COLORS.primary, paddingVertical: 2,
  },
  rowActions: { flexDirection: 'row', gap: 2 },
  actionBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },

  newRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    padding: SPACING.md, borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed',
  },
  newRowText: { fontSize: FONT_SIZE.md, fontWeight: '700', color: COLORS.primary },

  addCard: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, gap: SPACING.md, ...SHADOW.sm },
  iconPickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  iconChoice: {
    width: 38, height: 38, borderRadius: 10, backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'transparent',
  },
  iconChoiceActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  iconChoiceEmoji: { fontSize: 18 },
  addInput: {
    fontSize: FONT_SIZE.md, color: COLORS.text,
    backgroundColor: COLORS.background, borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.border, padding: SPACING.md,
  },
  addActions: { flexDirection: 'row', gap: SPACING.sm },
  addBtn: { flex: 1, backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZE.md },
  cancelBtn: { paddingHorizontal: SPACING.lg, justifyContent: 'center' },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: FONT_SIZE.md },
});
