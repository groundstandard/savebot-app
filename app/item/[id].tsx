import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Linking, Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { toggleFavorite } from '../../src/lib/api/saveItem';
import { useColors } from '../../src/hooks/useColors';
import { SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW, type ColorScheme } from '../../src/constants';
import type {
  SavedItem, RecipeData, WorkoutData, TravelData, ProductData, GenericData,
} from '../../src/types';

type ViewMode = 'clean' | 'original';

export default function ItemDetailScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<SavedItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('clean');
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    supabase
      .from('saved_items')
      .select('*, media:saved_item_media(*), category:categories(*), subcategory:subcategories(*)')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        if (data) {
          setItem(data as SavedItem);
          setFavorite((data as SavedItem).is_favorite);
        }
        setLoading(false);
      });
  }, [id]);

  async function handleFavoriteToggle() {
    if (!item) return;
    const next = !favorite;
    setFavorite(next);
    await toggleFavorite(item.id, next);
  }

  if (loading) return <View style={styles.centered}><ActivityIndicator color={c.primary} size="large" /></View>;
  if (!item) return <View style={styles.centered}><Text style={styles.notFound}>Item not found.</Text></View>;

  const isRecipe = item.content_classification === 'recipe';

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={c.text} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleFavoriteToggle} style={styles.iconBtn} activeOpacity={0.7}>
            <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={20} color={favorite ? '#EC4899' : c.text} />
          </TouchableOpacity>
          {item.source_url && (
            <TouchableOpacity onPress={() => Linking.openURL(item.source_url!)} style={styles.iconBtn} activeOpacity={0.7}>
              <Ionicons name="open-outline" size={20} color={c.text} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* View toggle */}
      <View style={styles.viewToggle}>
        {(['clean', 'original'] as ViewMode[]).map((v) => (
          <TouchableOpacity
            key={v}
            style={[styles.viewTab, view === v && styles.viewTabActive]}
            onPress={() => setView(v)}
            activeOpacity={0.85}
          >
            <Ionicons
              name={v === 'clean' ? 'sparkles' : 'phone-portrait-outline'}
              size={14}
              color={view === v ? c.primary : c.textSecondary}
            />
            <Text style={[styles.viewTabText, view === v && styles.viewTabTextActive]}>
              {v === 'clean' ? 'Clean View' : 'Original'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {view === 'clean' ? <CleanView item={item} /> : <OriginalView item={item} />}
      </ScrollView>

      {isRecipe && (
        <TouchableOpacity
          style={styles.cookModeButton}
          onPress={() => router.push({ pathname: '/cook-mode/[id]', params: { id: item.id } })}
          activeOpacity={0.9}
        >
          <Ionicons name="restaurant" size={18} color="#fff" />
          <Text style={styles.cookModeText}>Cook Mode</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function CleanView({ item }: { item: SavedItem }) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const data = item.structured_data;

  if (item.processing_status === 'processing' || item.processing_status === 'pending') {
    return (
      <View style={styles.stateCard}>
        <ActivityIndicator color={c.primary} />
        <Text style={styles.stateText}>AI is analyzing this content…</Text>
      </View>
    );
  }

  if (item.processing_status === 'failed') {
    return (
      <View style={styles.stateCard}>
        <Ionicons name="alert-circle-outline" size={32} color={c.danger} />
        <Text style={styles.stateText}>Analysis failed. Try re-saving this item.</Text>
      </View>
    );
  }

  return (
    <View>
      {item.ai_summary && <Text style={styles.summary}>{item.ai_summary}</Text>}
      {item.ai_tags.length > 0 && (
        <View style={styles.tags}>
          {item.ai_tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {data?.type === 'recipe' && <RecipeView data={data as RecipeData} />}
      {data?.type === 'workout' && <WorkoutView data={data as WorkoutData} />}
      {data?.type === 'travel' && <TravelView data={data as TravelData} />}
      {data?.type === 'product' && <ProductView data={data as ProductData} />}
      {data?.type === 'generic' && <GenericView data={data as GenericData} />}

      {!data && !item.ai_summary && (
        <View style={styles.stateCard}>
          <Ionicons name="document-text-outline" size={32} color={c.textTertiary} />
          <Text style={styles.stateText}>No structured details extracted for this item.</Text>
        </View>
      )}
    </View>
  );
}

/* ---------- Recipe ---------- */
function RecipeView({ data }: { data: RecipeData }) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View>
      <Text style={styles.title}>{data.dish_name}</Text>
      <MetaRow>
        {data.total_time_minutes ? <Meta icon="time-outline" label={`${data.total_time_minutes} min`} /> : null}
        {data.servings ? <Meta icon="people-outline" label={`${data.servings} servings`} /> : null}
        {data.difficulty ? <Meta icon="stats-chart-outline" label={data.difficulty} /> : null}
        {data.cuisine ? <Meta icon="globe-outline" label={data.cuisine} /> : null}
      </MetaRow>
      {data.dietary_tags.length > 0 && (
        <View style={styles.chipRow}>
          {data.dietary_tags.map((t) => <Chip key={t} label={t} />)}
        </View>
      )}
      <SectionHeader icon="list-outline" title="Ingredients" />
      {data.ingredients.map((ing, i) => (
        <View key={i} style={styles.bulletRow}>
          <View style={styles.bulletDot} />
          <Text style={styles.bulletText}>
            {[ing.quantity, ing.unit, ing.item].filter(Boolean).join(' ')}
            {ing.notes ? <Text style={styles.bulletNote}>  ({ing.notes})</Text> : null}
          </Text>
        </View>
      ))}
      <SectionHeader icon="footsteps-outline" title="Instructions" />
      {data.instructions.map((step) => (
        <View key={step.step} style={styles.step}>
          <Text style={styles.stepNum}>{step.step}</Text>
          <Text style={styles.stepText}>{step.text}</Text>
        </View>
      ))}
      {data.tips?.length > 0 && <Tips tips={data.tips} />}
    </View>
  );
}

/* ---------- Workout ---------- */
function WorkoutView({ data }: { data: WorkoutData }) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View>
      <Text style={styles.title}>{data.workout_name}</Text>
      <MetaRow>
        {data.duration_minutes ? <Meta icon="time-outline" label={`${data.duration_minutes} min`} /> : null}
        {data.difficulty ? <Meta icon="stats-chart-outline" label={data.difficulty} /> : null}
        {data.workout_type ? <Meta icon="barbell-outline" label={data.workout_type} /> : null}
      </MetaRow>
      {data.target_muscles.length > 0 && (
        <View style={styles.chipRow}>{data.target_muscles.map((m) => <Chip key={m} label={m} />)}</View>
      )}
      {data.equipment_needed.length > 0 && (
        <>
          <SectionHeader icon="construct-outline" title="Equipment" />
          <Text style={styles.paragraph}>{data.equipment_needed.join(', ')}</Text>
        </>
      )}
      <SectionHeader icon="fitness-outline" title="Exercises" />
      {data.exercises.map((ex, i) => (
        <View key={i} style={styles.exerciseCard}>
          <Text style={styles.exerciseName}>{ex.name}</Text>
          <Text style={styles.exerciseMeta}>
            {[
              ex.sets ? `${ex.sets} sets` : null,
              ex.reps ? `${ex.reps} reps` : null,
              ex.rest_seconds ? `${ex.rest_seconds}s rest` : null,
            ].filter(Boolean).join(' · ')}
          </Text>
          {ex.notes ? <Text style={styles.exerciseNote}>{ex.notes}</Text> : null}
        </View>
      ))}
      {data.tips?.length > 0 && <Tips tips={data.tips} />}
    </View>
  );
}

/* ---------- Travel ---------- */
function TravelView({ data }: { data: TravelData }) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View>
      <Text style={styles.title}>{data.destination}</Text>
      <MetaRow>
        {data.travel_type ? <Meta icon="airplane-outline" label={data.travel_type} /> : null}
        {data.recommended_season ? <Meta icon="sunny-outline" label={data.recommended_season} /> : null}
        {data.estimated_cost ? <Meta icon="cash-outline" label={data.estimated_cost} /> : null}
      </MetaRow>
      {data.locations.length > 0 && (
        <>
          <SectionHeader icon="location-outline" title="Places" />
          {data.locations.map((loc, i) => (
            <View key={i} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>{loc}</Text>
            </View>
          ))}
        </>
      )}
      {data.tips?.length > 0 && <Tips tips={data.tips} />}
    </View>
  );
}

/* ---------- Product ---------- */
function ProductView({ data }: { data: ProductData }) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View>
      <Text style={styles.title}>{data.product_name}</Text>
      <MetaRow>
        {data.brand ? <Meta icon="pricetag-outline" label={data.brand} /> : null}
        {data.price ? <Meta icon="cash-outline" label={data.price} /> : null}
        {data.category ? <Meta icon="albums-outline" label={data.category} /> : null}
      </MetaRow>
      {data.where_to_buy ? (
        <>
          <SectionHeader icon="cart-outline" title="Where to buy" />
          <Text style={styles.paragraph}>{data.where_to_buy}</Text>
        </>
      ) : null}
      {data.pros.length > 0 && (
        <>
          <SectionHeader icon="thumbs-up-outline" title="Pros" />
          {data.pros.map((p, i) => (
            <View key={i} style={styles.bulletRow}>
              <Ionicons name="checkmark" size={14} color={c.success} style={{ marginTop: 3 }} />
              <Text style={styles.bulletText}>{p}</Text>
            </View>
          ))}
        </>
      )}
      {data.cons.length > 0 && (
        <>
          <SectionHeader icon="thumbs-down-outline" title="Cons" />
          {data.cons.map((con, i) => (
            <View key={i} style={styles.bulletRow}>
              <Ionicons name="close" size={14} color={c.danger} style={{ marginTop: 3 }} />
              <Text style={styles.bulletText}>{con}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

/* ---------- Generic ---------- */
function GenericView({ data }: { data: GenericData }) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View>
      <Text style={styles.title}>{data.title}</Text>
      {data.key_points.length > 0 && (
        <>
          <SectionHeader icon="bulb-outline" title="Key points" />
          {data.key_points.map((k, i) => (
            <View key={i} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>{k}</Text>
            </View>
          ))}
        </>
      )}
      {data.actionable_items.length > 0 && (
        <>
          <SectionHeader icon="checkbox-outline" title="Action items" />
          {data.actionable_items.map((a, i) => (
            <View key={i} style={styles.bulletRow}>
              <Ionicons name="arrow-forward" size={14} color={c.primary} style={{ marginTop: 3 }} />
              <Text style={styles.bulletText}>{a}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

/* ---------- Shared bits ---------- */
function MetaRow({ children }: { children: React.ReactNode }) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return <View style={styles.metaRow}>{children}</View>;
}
function Meta({ icon, label }: { icon: any; label: string }) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={styles.metaPill}>
      <Ionicons name={icon} size={13} color={c.primary} />
      <Text style={styles.metaText}>{label}</Text>
    </View>
  );
}
function Chip({ label }: { label: string }) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return <View style={styles.chip}><Text style={styles.chipText}>{label}</Text></View>;
}
function SectionHeader({ icon, title }: { icon: any; title: string }) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={styles.sectionHeaderRow}>
      <Ionicons name={icon} size={16} color={c.text} />
      <Text style={styles.sectionHeader}>{title}</Text>
    </View>
  );
}
function Tips({ tips }: { tips: string[] }) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={styles.tipsCard}>
      <View style={styles.sectionHeaderRow}>
        <Ionicons name="bulb" size={15} color={c.warning} />
        <Text style={styles.tipsTitle}>Tips</Text>
      </View>
      {tips.map((t, i) => (
        <Text key={i} style={styles.tipText}>• {t}</Text>
      ))}
    </View>
  );
}

function OriginalView({ item }: { item: SavedItem }) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View>
      {item.source_creator_handle && (
        <View style={styles.creatorRow}>
          <View style={styles.creatorAvatar}>
            <Ionicons name="person" size={16} color={c.textSecondary} />
          </View>
          <Text style={styles.creatorHandle}>@{item.source_creator_handle}</Text>
        </View>
      )}
      <SectionHeader icon="chatbox-outline" title="Original Caption" />
      <Text style={styles.paragraph}>{item.raw_caption ?? 'No caption available.'}</Text>
      {item.raw_hashtags.length > 0 && (
        <Text style={styles.hashtags}>{item.raw_hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')}</Text>
      )}
    </View>
  );
}

const makeStyles = (c: ColorScheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background },
  notFound: { color: c.textSecondary, fontSize: FONT_SIZE.md },

  topBar: {
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  headerActions: { flexDirection: 'row', gap: SPACING.sm },
  iconBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: c.white, alignItems: 'center', justifyContent: 'center',
    ...SHADOW.sm,
  },

  viewToggle: {
    flexDirection: 'row', marginHorizontal: SPACING.md, marginBottom: SPACING.md,
    backgroundColor: c.surfaceAlt, borderRadius: BORDER_RADIUS.md, padding: 4,
  },
  viewTab: {
    flex: 1, flexDirection: 'row', gap: 5, paddingVertical: 9,
    borderRadius: BORDER_RADIUS.sm, alignItems: 'center', justifyContent: 'center',
  },
  viewTabActive: { backgroundColor: c.white, ...SHADOW.sm },
  viewTabText: { fontSize: FONT_SIZE.sm, color: c.textSecondary, fontWeight: '600' },
  viewTabTextActive: { color: c.text },

  content: { paddingHorizontal: SPACING.md, paddingBottom: 120 },
  summary: { fontSize: FONT_SIZE.md, color: c.text, lineHeight: 24, marginBottom: SPACING.md },

  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: SPACING.md },
  tag: { backgroundColor: c.primaryLight, borderRadius: BORDER_RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: FONT_SIZE.xs, color: c.primary, fontWeight: '700' },

  stateCard: { alignItems: 'center', padding: SPACING.xl, gap: SPACING.md, marginTop: SPACING.xl },
  stateText: { color: c.textSecondary, fontSize: FONT_SIZE.sm, textAlign: 'center' },

  title: { fontSize: 24, fontWeight: '800', color: c.text, marginBottom: SPACING.sm, letterSpacing: -0.5 },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: SPACING.sm },
  metaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: c.white, borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 5, ...SHADOW.sm,
  },
  metaText: { fontSize: FONT_SIZE.xs, color: c.text, fontWeight: '600', textTransform: 'capitalize' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: SPACING.sm },
  chip: { backgroundColor: c.surfaceAlt, borderRadius: BORDER_RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontSize: FONT_SIZE.xs, color: c.textSecondary, fontWeight: '600', textTransform: 'capitalize' },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  sectionHeader: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: c.text },

  paragraph: { fontSize: FONT_SIZE.sm, color: c.text, lineHeight: 22 },

  bulletRow: { flexDirection: 'row', gap: 8, marginBottom: 6, alignItems: 'flex-start' },
  bulletDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: c.primary, marginTop: 8 },
  bulletText: { flex: 1, fontSize: FONT_SIZE.sm, color: c.text, lineHeight: 21 },
  bulletNote: { color: c.textTertiary, fontSize: FONT_SIZE.xs },

  step: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  stepNum: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: c.primary,
    textAlign: 'center', lineHeight: 26, color: '#fff', fontWeight: '700', fontSize: FONT_SIZE.sm, overflow: 'hidden',
  },
  stepText: { flex: 1, fontSize: FONT_SIZE.sm, color: c.text, lineHeight: 22, paddingTop: 3 },

  exerciseCard: {
    backgroundColor: c.white, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOW.sm,
  },
  exerciseName: { fontSize: FONT_SIZE.md, fontWeight: '700', color: c.text },
  exerciseMeta: { fontSize: FONT_SIZE.sm, color: c.primary, fontWeight: '600', marginTop: 2 },
  exerciseNote: { fontSize: FONT_SIZE.xs, color: c.textSecondary, marginTop: 4 },

  tipsCard: {
    backgroundColor: '#FFFBEB', borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, marginTop: SPACING.lg,
  },
  tipsTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: '#92400E' },
  tipText: { fontSize: FONT_SIZE.sm, color: '#78350F', lineHeight: 22, marginTop: 4 },

  creatorRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  creatorAvatar: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  creatorHandle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: c.text },
  hashtags: { fontSize: FONT_SIZE.sm, color: c.primary, marginTop: SPACING.sm, lineHeight: 22 },

  cookModeButton: {
    position: 'absolute', bottom: 28, left: SPACING.md, right: SPACING.md,
    flexDirection: 'row', gap: SPACING.sm,
    backgroundColor: c.primary, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md, alignItems: 'center', justifyContent: 'center',
    ...SHADOW.primary,
  },
  cookModeText: { color: '#fff', fontSize: FONT_SIZE.md, fontWeight: '800' },
});
