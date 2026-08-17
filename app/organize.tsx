import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { useLibraryStore } from '../src/store/library';
import { shareTitle } from '../src/lib/api/shareItem';
import { moralLessonIcon } from '../src/constants/organization';
import { useColors } from '../src/hooks/useColors';
import { SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW, type ColorScheme } from '../src/constants';
import type { SavedItem } from '../src/types';

type Dimension = 'moral_lesson' | 'people' | 'topic';

const DIMENSIONS: { key: Dimension; label: string; empty: string }[] = [
  { key: 'moral_lesson', label: 'Theme', empty: 'Unthemed' },
  { key: 'people', label: 'Person', empty: 'No person' },
  { key: 'topic', label: 'Topic', empty: 'No topic' },
];

/** Build value → items groups for a dimension. A `people` item lands in each of its people. */
function groupBy(items: SavedItem[], dim: Dimension, emptyLabel: string) {
  const map = new Map<string, SavedItem[]>();
  const add = (key: string, it: SavedItem) => {
    const arr = map.get(key) ?? [];
    arr.push(it);
    map.set(key, arr);
  };
  for (const it of items) {
    if (dim === 'people') {
      const people = it.people ?? [];
      if (people.length === 0) add(emptyLabel, it);
      else people.forEach((p) => add(p, it));
    } else {
      const v = (it[dim] as string | null) || emptyLabel;
      add(v, it);
    }
  }
  return [...map.entries()]
    .map(([value, list]) => ({ value, list }))
    .sort((a, b) => b.list.length - a.list.length || a.value.localeCompare(b.value));
}

export default function Organize() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { items } = useLibraryStore();
  const [dim, setDim] = useState<Dimension>('moral_lesson');
  const [expanded, setExpanded] = useState<string | null>(null);

  const active = DIMENSIONS.find((d) => d.key === dim)!;
  const groups = useMemo(() => groupBy(items, dim, active.empty), [items, dim, active.empty]);

  return (
    <View style={styles.root}>
      <ScreenHeader title="Organize" />

      {/* Dimension switch */}
      <View style={styles.segment}>
        {DIMENSIONS.map((d) => {
          const on = d.key === dim;
          return (
            <TouchableOpacity
              key={d.key}
              style={[styles.segmentBtn, on && styles.segmentBtnOn]}
              onPress={() => { setDim(d.key); setExpanded(null); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{d.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {groups.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="albums-outline" size={30} color={c.textTertiary} />
            <Text style={styles.emptyText}>Nothing to organize yet. Save a few posts and they'll group here.</Text>
          </View>
        )}

        {groups.map((g) => {
          const open = expanded === g.value;
          return (
            <View key={g.value} style={styles.group}>
              <TouchableOpacity style={styles.groupHead} onPress={() => setExpanded(open ? null : g.value)} activeOpacity={0.7}>
                <View style={styles.groupIcon}>
                  <Ionicons
                    name={(dim === 'moral_lesson' ? moralLessonIcon(g.value) : dim === 'people' ? 'person-outline' : 'pricetag-outline') as never}
                    size={16}
                    color={c.primary}
                  />
                </View>
                <Text style={styles.groupTitle} numberOfLines={1}>{g.value}</Text>
                <View style={styles.countPill}><Text style={styles.countText}>{g.list.length}</Text></View>
                <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={c.textTertiary} />
              </TouchableOpacity>

              {open && (
                <View style={styles.groupBody}>
                  {g.list.map((it) => (
                    <TouchableOpacity
                      key={it.id}
                      style={styles.itemRow}
                      onPress={() => router.push({ pathname: '/item/[id]', params: { id: it.id } })}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.itemTitle} numberOfLines={1}>{shareTitle(it)}</Text>
                      {!!it.topic && dim !== 'topic' && <Text style={styles.itemSub} numberOfLines={1}>{it.topic}</Text>}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: ColorScheme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  segment: {
    flexDirection: 'row', gap: 6, margin: SPACING.md, padding: 4,
    backgroundColor: c.surfaceAlt, borderRadius: BORDER_RADIUS.md,
  },
  segmentBtn: { flex: 1, paddingVertical: 8, borderRadius: BORDER_RADIUS.sm, alignItems: 'center' },
  segmentBtnOn: { backgroundColor: c.white, ...SHADOW.sm },
  segmentText: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: c.textSecondary },
  segmentTextOn: { color: c.primary },

  body: { padding: SPACING.md, paddingTop: 0 },
  group: { backgroundColor: c.white, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.sm, ...SHADOW.sm, overflow: 'hidden' },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md },
  groupIcon: { width: 30, height: 30, borderRadius: 9, backgroundColor: c.primaryLight, alignItems: 'center', justifyContent: 'center' },
  groupTitle: { flex: 1, fontSize: FONT_SIZE.md, fontWeight: '700', color: c.text },
  countPill: { backgroundColor: c.surfaceAlt, borderRadius: BORDER_RADIUS.full, paddingHorizontal: 9, paddingVertical: 2 },
  countText: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: c.textSecondary },

  groupBody: { borderTopWidth: 1, borderTopColor: c.border },
  itemRow: { paddingVertical: 11, paddingHorizontal: SPACING.md, borderBottomWidth: 1, borderBottomColor: c.border },
  itemTitle: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: c.text },
  itemSub: { fontSize: FONT_SIZE.xs, color: c.textTertiary, marginTop: 2 },

  emptyCard: { alignItems: 'center', gap: SPACING.sm, padding: SPACING.xl, marginTop: SPACING.xl },
  emptyText: { fontSize: FONT_SIZE.sm, color: c.textTertiary, textAlign: 'center', lineHeight: 20 },
});
