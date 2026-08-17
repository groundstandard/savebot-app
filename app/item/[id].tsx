import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Modal,
  ActivityIndicator, Linking, Platform, Switch,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import {
  toggleFavorite, retryProcessing, archiveItem, deleteItem,
  updateItemCategory, updateNotes, setPreferredView, updateTags, recordCategoryCorrection, setItemPublic,
} from '../../src/lib/api/saveItem';
import { shareSavedItem } from '../../src/lib/api/shareItem';
import { exportItemPdf } from '../../src/lib/pdf';
import { useLibraryStore } from '../../src/store/library';
import { tapFeedback, warnFeedback } from '../../src/lib/haptics';
import { ConfirmModal } from '../../src/components/ConfirmModal';
import { EmbedPlayer } from '../../src/components/item/EmbedPlayer';
import { useColors } from '../../src/hooks/useColors';
import { SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW, type ColorScheme } from '../../src/constants';
import { moralLessonIcon } from '../../src/constants/organization';
import type {
  SavedItem, SavedItemMedia, RecipeData, WorkoutData, TravelData, ProductData, GenericData,
} from '../../src/types';

/** Resolve a private-bucket media path to a temporary signed URL. */
async function signedMediaUrl(media?: SavedItemMedia): Promise<string | null> {
  if (!media?.storage_path) return null;
  const [bucket, ...rest] = media.storage_path.split('/');
  const { data } = await supabase.storage.from(bucket).createSignedUrl(rest.join('/'), 3600);
  return data?.signedUrl ?? null;
}

type ViewMode = 'clean' | 'original';

export default function ItemDetailScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<SavedItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('clean');
  const [favorite, setFavorite] = useState(false);
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [related, setRelated] = useState<SavedItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [isPublic, setIsPublic] = useState(false);

  const {
    categories, subcategories, fetchCategories, fetchSubcategories,
    updateItem, removeItem,
  } = useLibraryStore();

  const loadItem = useCallback(async () => {
    const { data } = await supabase
      .from('saved_items')
      .select('*, media:saved_item_media(*), category:categories(*), subcategory:subcategories(*)')
      .eq('id', id)
      .single();
    if (data) {
      const saved = data as SavedItem;
      setItem(saved);
      setFavorite(saved.is_favorite);
      setIsPublic(saved.is_public);
      setNotes(saved.user_notes ?? '');
      setView(saved.preferred_view ?? 'clean');
      const thumb = saved.media?.find((m) => m.media_type === 'thumbnail') ?? saved.media?.[0];
      setThumbUrl(await signedMediaUrl(thumb));

      // Related: same subcategory if set, else same category.
      const col = saved.subcategory_id ? 'subcategory_id' : saved.category_id ? 'category_id' : null;
      const val = saved.subcategory_id ?? saved.category_id;
      if (col && val) {
        const { data: rel } = await supabase
          .from('saved_items')
          .select('*')
          .eq(col, val)
          .eq('is_archived', false)
          .neq('id', saved.id)
          .order('created_at', { ascending: false })
          .limit(5);
        setRelated((rel as SavedItem[]) ?? []);
      } else {
        setRelated([]);
      }
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { loadItem(); }, [loadItem]);
  useEffect(() => { fetchCategories(true); }, []);

  async function handleFavoriteToggle() {
    if (!item) return;
    const next = !favorite;
    tapFeedback();
    setFavorite(next);
    updateItem(item.id, { is_favorite: next });
    await toggleFavorite(item.id, next);
  }

  async function handlePublicToggle(v: boolean) {
    if (!item) return;
    setIsPublic(v);
    setItem({ ...item, is_public: v });
    await setItemPublic(item.id, v);
  }

  async function handleRetry() {
    if (!item) return;
    setItem({ ...item, processing_status: 'pending' });
    await retryProcessing(item.id);
    // Give the Edge Function a moment, then refresh.
    setTimeout(() => { loadItem(); }, 4000);
  }

  function changeView(v: ViewMode) {
    setView(v);
    if (item) setPreferredView(item.id, v);
  }

  async function saveNotes() {
    if (!item || notes === (item.user_notes ?? '')) return;
    setItem({ ...item, user_notes: notes });
    await updateNotes(item.id, notes);
  }

  async function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (!item || !t || item.ai_tags.includes(t)) { setTagInput(''); return; }
    const next = [...item.ai_tags, t];
    setItem({ ...item, ai_tags: next });
    setTagInput('');
    updateItem(item.id, { ai_tags: next });
    await updateTags(item.id, next);
  }

  async function removeTag(tag: string) {
    if (!item) return;
    const next = item.ai_tags.filter((x) => x !== tag);
    setItem({ ...item, ai_tags: next });
    updateItem(item.id, { ai_tags: next });
    await updateTags(item.id, next);
  }

  async function openPicker() {
    if (item?.category_id) fetchSubcategories(item.category_id);
    setPickerOpen(true);
  }

  async function pickCategory(categoryId: string) {
    if (!item) return;
    setItem({ ...item, category_id: categoryId, subcategory_id: null });
    updateItem(item.id, { category_id: categoryId, subcategory_id: null });
    fetchSubcategories(categoryId);
    await updateItemCategory(item.id, categoryId, null);
    // Teach the extractor how this user files this kind of content.
    const catName = categories.find((cat) => cat.id === categoryId)?.name;
    if (catName) recordCategoryCorrection(item.content_classification, catName);
  }

  async function pickSubcategory(subId: string | null) {
    if (!item?.category_id) return;
    setItem({ ...item, subcategory_id: subId });
    updateItem(item.id, { subcategory_id: subId });
    await updateItemCategory(item.id, item.category_id, subId);
  }

  async function handleArchive() {
    if (!item) return;
    removeItem(item.id);
    await archiveItem(item.id);
    router.back();
  }

  function openShare() {
    setIncludeNotes(notes.trim().length > 0);
    setShareOpen(true);
  }

  async function doShare() {
    if (!item) return;
    setShareOpen(false);
    tapFeedback();
    await shareSavedItem(item, { includeNotes });
  }

  async function doExportPdf() {
    if (!item) return;
    setShareOpen(false);
    tapFeedback();
    try { await exportItemPdf(item, includeNotes); } catch { /* user canceled or export failed */ }
  }

  async function handleDelete() {
    if (!item) return;
    warnFeedback();
    removeItem(item.id);
    await deleteItem(item.id);
    router.back();
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
          <TouchableOpacity onPress={openShare} style={styles.iconBtn} activeOpacity={0.7}>
            <Ionicons name="share-social-outline" size={19} color={c.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleArchive} style={styles.iconBtn} activeOpacity={0.7}>
            <Ionicons name="archive-outline" size={19} color={c.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setConfirmDelete(true)} style={styles.iconBtn} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={19} color={c.danger} />
          </TouchableOpacity>
        </View>
      </View>

      {/* View toggle */}
      <View style={styles.viewToggle}>
        {(['clean', 'original'] as ViewMode[]).map((v) => (
          <TouchableOpacity
            key={v}
            style={[styles.viewTab, view === v && styles.viewTabActive]}
            onPress={() => changeView(v)}
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
        {thumbUrl && (
          <Image source={{ uri: thumbUrl }} style={styles.hero} resizeMode="cover" />
        )}
        {view === 'clean' ? <CleanView item={item} onRetry={handleRetry} /> : <OriginalView item={item} />}

        {/* Category / subcategory */}
        <TouchableOpacity style={styles.metaSection} onPress={openPicker} activeOpacity={0.8}>
          <View style={styles.metaSectionLeft}>
            <Ionicons name="albums-outline" size={16} color={c.textSecondary} />
            <Text style={styles.metaSectionLabel}>Category</Text>
          </View>
          <View style={styles.metaSectionRight}>
            <Text style={styles.metaSectionValue}>
              {categories.find((cat) => cat.id === item.category_id)?.name ?? 'Uncategorized'}
              {item.subcategory_id
                ? ` · ${subcategories.find((s) => s.id === item.subcategory_id)?.name ?? ''}`
                : ''}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={c.textTertiary} />
          </View>
        </TouchableOpacity>

        {/* Organization: theme, topic, people (tap to browse) */}
        {(item.moral_lesson || item.topic || (item.people?.length ?? 0) > 0) && (
          <TouchableOpacity style={styles.orgSection} onPress={() => router.push('/organize')} activeOpacity={0.85}>
            {!!item.moral_lesson && (
              <View style={styles.orgRow}>
                <Ionicons name={moralLessonIcon(item.moral_lesson) as never} size={15} color={c.primary} />
                <Text style={styles.orgValue}>{item.moral_lesson}</Text>
              </View>
            )}
            {!!item.topic && (
              <View style={styles.orgRow}>
                <Ionicons name="pricetag-outline" size={15} color={c.textSecondary} />
                <Text style={styles.orgValue} numberOfLines={2}>{item.topic}</Text>
              </View>
            )}
            {(item.people?.length ?? 0) > 0 && (
              <View style={styles.orgRow}>
                <Ionicons name="people-outline" size={15} color={c.textSecondary} />
                <Text style={styles.orgValue} numberOfLines={2}>{item.people.join(', ')}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* References: fuller sources online + links the post mentions */}
        {(item.reference_links?.length ?? 0) > 0 && (
          <View style={styles.notesSection}>
            <View style={styles.metaSectionLeft}>
              <Ionicons name="link-outline" size={16} color={c.textSecondary} />
              <Text style={styles.metaSectionLabel}>References</Text>
            </View>
            {item.reference_links.map((ref, i) => (
              <TouchableOpacity
                key={`${ref.url}-${i}`}
                style={styles.refRow}
                onPress={() => Linking.openURL(ref.url)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={(ref.source === 'youtube' ? 'logo-youtube' : 'globe-outline') as never}
                  size={16}
                  color={ref.source === 'youtube' ? '#FF0000' : c.primary}
                />
                <Text style={styles.refText} numberOfLines={2}>{ref.title}</Text>
                <Ionicons name="open-outline" size={14} color={c.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Tags (editable) */}
        <View style={styles.notesSection}>
          <View style={styles.metaSectionLeft}>
            <Ionicons name="pricetags-outline" size={16} color={c.textSecondary} />
            <Text style={styles.metaSectionLabel}>Tags</Text>
          </View>
          <View style={styles.tagsEditRow}>
            {item.ai_tags.map((tag) => (
              <TouchableOpacity key={tag} style={styles.tagEditable} onPress={() => removeTag(tag)} activeOpacity={0.7}>
                <Text style={styles.tagText}>{tag}</Text>
                <Ionicons name="close" size={12} color={c.primary} />
              </TouchableOpacity>
            ))}
            <TextInput
              style={styles.tagInput}
              value={tagInput}
              onChangeText={setTagInput}
              onSubmitEditing={addTag}
              placeholder="+ tag"
              placeholderTextColor={c.textTertiary}
              returnKeyType="done"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* Notes */}
        <View style={styles.notesSection}>
          <View style={styles.metaSectionLeft}>
            <Ionicons name="create-outline" size={16} color={c.textSecondary} />
            <Text style={styles.metaSectionLabel}>Notes</Text>
          </View>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            onBlur={saveNotes}
            placeholder="Add a note…"
            placeholderTextColor={c.textTertiary}
            multiline
          />
        </View>

        {/* Public toggle */}
        <View style={styles.publicRow}>
          <View style={styles.publicLeft}>
            <Ionicons name="globe-outline" size={16} color={c.textSecondary} />
            <View style={styles.publicTextWrap}>
              <Text style={styles.metaSectionLabel}>Public</Text>
              <Text style={styles.publicHint}>Show on your profile &amp; followers' feed</Text>
            </View>
          </View>
          <Switch value={isPublic} onValueChange={handlePublicToggle} trackColor={{ true: c.primary, false: '#D1D5DB' }} thumbColor="#fff" />
        </View>

        {/* Related */}
        {related.length > 0 && (
          <View style={styles.relatedSection}>
            <View style={styles.metaSectionLeft}>
              <Ionicons name="git-network-outline" size={16} color={c.textSecondary} />
              <Text style={styles.metaSectionLabel}>Related</Text>
            </View>
            {related.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={styles.relatedRow}
                onPress={() => router.push({ pathname: '/item/[id]', params: { id: r.id } })}
                activeOpacity={0.7}
              >
                <Text style={styles.relatedText} numberOfLines={1}>
                  {r.ai_summary ?? r.raw_caption ?? 'Untitled save'}
                </Text>
                <Ionicons name="chevron-forward" size={15} color={c.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        )}
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

      {/* Category / subcategory picker */}
      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <TouchableOpacity style={styles.sheetScrim} activeOpacity={1} onPress={() => setPickerOpen(false)}>
          <TouchableOpacity style={styles.sheet} activeOpacity={1} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Move to category</Text>
            <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
              {categories.map((cat) => {
                const active = cat.id === item.category_id;
                return (
                  <TouchableOpacity key={cat.id} style={styles.sheetRow} onPress={() => pickCategory(cat.id)} activeOpacity={0.7}>
                    <Text style={styles.sheetEmoji}>{cat.icon}</Text>
                    <Text style={[styles.sheetRowText, active && styles.sheetRowTextActive]}>{cat.name}</Text>
                    {active && <Ionicons name="checkmark-circle" size={18} color={c.primary} />}
                  </TouchableOpacity>
                );
              })}

              {item.category_id && subcategories.length > 0 && (
                <>
                  <Text style={styles.sheetSubLabel}>Subcategory</Text>
                  <TouchableOpacity style={styles.sheetChipRow} onPress={() => pickSubcategory(null)} activeOpacity={0.7}>
                    <Text style={[styles.sheetRowText, !item.subcategory_id && styles.sheetRowTextActive]}>None</Text>
                    {!item.subcategory_id && <Ionicons name="checkmark-circle" size={18} color={c.primary} />}
                  </TouchableOpacity>
                  {subcategories.map((s) => {
                    const active = s.id === item.subcategory_id;
                    return (
                      <TouchableOpacity key={s.id} style={styles.sheetChipRow} onPress={() => pickSubcategory(s.id)} activeOpacity={0.7}>
                        <Text style={[styles.sheetRowText, active && styles.sheetRowTextActive]}>{s.name}</Text>
                        {active && <Ionicons name="checkmark-circle" size={18} color={c.primary} />}
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.sheetDone} onPress={() => setPickerOpen(false)} activeOpacity={0.85}>
              <Text style={styles.sheetDoneText}>Done</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Share options */}
      <Modal visible={shareOpen} transparent animationType="slide" onRequestClose={() => setShareOpen(false)}>
        <TouchableOpacity style={styles.sheetScrim} activeOpacity={1} onPress={() => setShareOpen(false)}>
          <TouchableOpacity style={styles.sheet} activeOpacity={1} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Share this save</Text>
            <Text style={styles.shareHint}>Sends a clean summary card with a link back to the original post.</Text>
            {notes.trim().length > 0 && (
              <TouchableOpacity style={styles.shareToggleRow} activeOpacity={0.7} onPress={() => setIncludeNotes((v) => !v)}>
                <View style={styles.metaSectionLeft}>
                  <Ionicons name="create-outline" size={16} color={c.textSecondary} />
                  <Text style={styles.sheetRowText}>Include my notes</Text>
                </View>
                <Ionicons name={includeNotes ? 'toggle' : 'toggle-outline'} size={30} color={includeNotes ? c.primary : c.textTertiary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.shareBtn} onPress={doShare} activeOpacity={0.85}>
              <Ionicons name="share-social" size={16} color="#fff" />
              <Text style={styles.sheetDoneText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareBtnAlt} onPress={doExportPdf} activeOpacity={0.85}>
              <Ionicons name="document-text-outline" size={16} color={c.primary} />
              <Text style={styles.shareBtnAltText}>Export as PDF</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <ConfirmModal
        visible={confirmDelete}
        danger
        title="Delete this save?"
        message="This permanently removes the item from your library."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </View>
  );
}

function CleanView({ item, onRetry }: { item: SavedItem; onRetry: () => void }) {
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
        <Text style={styles.stateText}>Analysis failed. You can try again.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={onRetry} activeOpacity={0.85}>
          <Ionicons name="refresh" size={16} color="#fff" />
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const confidence = (item.original_post_data as { ai_confidence?: number } | null)?.ai_confidence;
  // Only flag genuinely weak analyses. Image/video posts without a strong caption
  // sit around 0.4–0.5, which is still useful — don't nag on those.
  const lowConfidence = typeof confidence === 'number' && confidence < 0.35;

  return (
    <View>
      {lowConfidence && (
        <View style={styles.reviewBanner}>
          <Ionicons name="alert-circle-outline" size={16} color={c.warning} />
          <Text style={styles.reviewText}>AI wasn't fully sure — double-check the details.</Text>
        </View>
      )}
      {item.ai_summary && <Text style={styles.summary}>{item.ai_summary}</Text>}

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
  const oembed = (item.original_post_data as { oembed?: { html?: string | null } } | null)?.oembed ?? {};
  return (
    <View>
      <EmbedPlayer html={oembed.html} sourceUrl={item.source_url} platform={item.source_platform} />
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
  reviewBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: '#FFFBEB', borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  reviewText: { flex: 1, fontSize: FONT_SIZE.xs, color: '#92400E', fontWeight: '600' },
  hero: {
    width: '100%', height: 200, borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md, backgroundColor: c.surfaceAlt,
  },
  summary: { fontSize: FONT_SIZE.md, color: c.text, lineHeight: 24, marginBottom: SPACING.md },

  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: SPACING.md },
  tag: { backgroundColor: c.primaryLight, borderRadius: BORDER_RADIUS.full, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: FONT_SIZE.xs, color: c.primary, fontWeight: '700' },

  stateCard: { alignItems: 'center', padding: SPACING.xl, gap: SPACING.md, marginTop: SPACING.xl },
  stateText: { color: c.textSecondary, fontSize: FONT_SIZE.sm, textAlign: 'center' },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: c.primary, borderRadius: BORDER_RADIUS.md,
    paddingVertical: 10, paddingHorizontal: SPACING.lg,
  },
  retryText: { color: '#fff', fontSize: FONT_SIZE.sm, fontWeight: '700' },

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

  metaSection: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: c.white, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, marginTop: SPACING.lg, ...SHADOW.sm,
  },
  metaSectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  metaSectionLabel: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: c.textSecondary },
  metaSectionRight: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  metaSectionValue: { fontSize: FONT_SIZE.sm, color: c.text, fontWeight: '600', textAlign: 'right' },

  orgSection: {
    backgroundColor: c.white, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, marginTop: SPACING.sm, gap: 8, ...SHADOW.sm,
  },
  orgRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orgValue: { flex: 1, fontSize: FONT_SIZE.sm, color: c.text, fontWeight: '500' },

  refRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  refText: { flex: 1, fontSize: FONT_SIZE.sm, color: c.primary, fontWeight: '500' },

  notesSection: {
    backgroundColor: c.white, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, marginTop: SPACING.sm, gap: SPACING.xs, ...SHADOW.sm,
  },
  notesInput: {
    fontSize: FONT_SIZE.sm, color: c.text, lineHeight: 21,
    minHeight: 40, textAlignVertical: 'top', paddingTop: 2,
  },

  publicRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: c.white, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, marginTop: SPACING.sm, ...SHADOW.sm,
  },
  publicLeft: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 },
  publicTextWrap: { flex: 1 },
  publicHint: { fontSize: FONT_SIZE.xs, color: c.textTertiary, marginTop: 2 },

  tagsEditRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  tagEditable: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: c.primaryLight, borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  tagInput: {
    minWidth: 70, flexGrow: 1, fontSize: FONT_SIZE.sm, color: c.text,
    paddingVertical: 4,
  },

  relatedSection: {
    backgroundColor: c.white, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, marginTop: SPACING.sm, gap: SPACING.xs, ...SHADOW.sm,
  },
  relatedRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: SPACING.sm, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: c.border,
  },
  relatedText: { flex: 1, fontSize: FONT_SIZE.sm, color: c.text },

  sheetScrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: c.background, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: SPACING.md, paddingBottom: 32, paddingTop: SPACING.sm, maxHeight: '75%',
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: c.border,
    alignSelf: 'center', marginBottom: SPACING.md,
  },
  sheetTitle: { fontSize: FONT_SIZE.lg, fontWeight: '800', color: c.text, marginBottom: SPACING.sm },
  sheetScroll: { flexGrow: 0 },
  sheetRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border,
  },
  sheetEmoji: { fontSize: 18 },
  sheetRowText: { flex: 1, fontSize: FONT_SIZE.md, color: c.text, fontWeight: '500' },
  sheetRowTextActive: { color: c.primary, fontWeight: '700' },
  sheetSubLabel: {
    fontSize: FONT_SIZE.xs, fontWeight: '700', color: c.textTertiary,
    textTransform: 'uppercase', letterSpacing: 1, marginTop: SPACING.md, marginBottom: SPACING.xs,
  },
  sheetChipRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: 10,
  },
  sheetDone: {
    backgroundColor: c.primary, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, alignItems: 'center', marginTop: SPACING.md,
  },
  sheetDoneText: { color: '#fff', fontSize: FONT_SIZE.md, fontWeight: '700' },

  shareHint: { fontSize: FONT_SIZE.sm, color: c.textSecondary, lineHeight: 20, marginBottom: SPACING.md },
  shareToggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: SPACING.sm, borderTopWidth: 1, borderTopColor: c.border,
  },
  shareBtn: {
    flexDirection: 'row', gap: 8, backgroundColor: c.primary, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, alignItems: 'center', justifyContent: 'center', marginTop: SPACING.md,
  },
  shareBtnAlt: {
    flexDirection: 'row', gap: 8, backgroundColor: 'transparent', borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5, borderColor: c.primary,
    padding: SPACING.md, alignItems: 'center', justifyContent: 'center', marginTop: SPACING.sm,
  },
  shareBtnAltText: { color: c.primary, fontSize: FONT_SIZE.md, fontWeight: '700' },

  cookModeButton: {
    position: 'absolute', bottom: 28, left: SPACING.md, right: SPACING.md,
    flexDirection: 'row', gap: SPACING.sm,
    backgroundColor: c.primary, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md, alignItems: 'center', justifyContent: 'center',
    ...SHADOW.primary,
  },
  cookModeText: { color: '#fff', fontSize: FONT_SIZE.md, fontWeight: '800' },
});
