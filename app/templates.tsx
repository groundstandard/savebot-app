import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../src/components/ScreenHeader';
import {
  listTemplates, installTemplate, publishTemplate, templateCategoryCount, type CommunityTemplate,
} from '../src/lib/api/templates';
import { useLibraryStore } from '../src/store/library';
import { successFeedback } from '../src/lib/haptics';
import { useColors } from '../src/hooks/useColors';
import { SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW, type ColorScheme } from '../src/constants';

export default function TemplatesScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [templates, setTemplates] = useState<CommunityTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [pubOpen, setPubOpen] = useState(false);
  const [pubName, setPubName] = useState('');
  const [pubDesc, setPubDesc] = useState('');
  const [publishing, setPublishing] = useState(false);
  const fetchCategories = useLibraryStore((s) => s.fetchCategories);

  const load = useCallback(async () => {
    setTemplates(await listTemplates());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleInstall(t: CommunityTemplate) {
    setInstalling(t.id);
    setMsg('');
    try {
      const added = await installTemplate(t);
      await fetchCategories(true);
      successFeedback();
      setMsg(added > 0 ? `Added ${added} categor${added === 1 ? 'y' : 'ies'} from "${t.name}".` : `You already have "${t.name}"'s categories.`);
      load();
    } catch {
      setMsg('Could not install that template. Try again.');
    }
    setInstalling(null);
  }

  async function handlePublish() {
    if (!pubName.trim() || publishing) return;
    setPublishing(true);
    try {
      await publishTemplate(pubName, pubDesc);
      setPubOpen(false); setPubName(''); setPubDesc('');
      successFeedback();
      setMsg('Published! Your category setup is now a template.');
      load();
    } catch {
      setMsg('Could not publish. Try again.');
    }
    setPublishing(false);
  }

  return (
    <View style={styles.root}>
      <ScreenHeader title="Category templates" />

      <FlatList
        data={templates}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            <TouchableOpacity style={styles.publishCard} onPress={() => setPubOpen(true)} activeOpacity={0.85}>
              <View style={styles.publishIcon}><Ionicons name="cloud-upload-outline" size={20} color={c.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.publishTitle}>Publish your setup</Text>
                <Text style={styles.publishSub}>Share your categories as a template others can install.</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={c.textTertiary} />
            </TouchableOpacity>
            {msg ? <Text style={styles.msg}>{msg}</Text> : null}
            {loading ? <ActivityIndicator color={c.primary} style={{ marginTop: SPACING.xl }} /> : null}
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
            <View style={styles.metaRow}>
              <Ionicons name="albums-outline" size={13} color={c.textTertiary} />
              <Text style={styles.meta}>{templateCategoryCount(item)} categories</Text>
              <Ionicons name="download-outline" size={13} color={c.textTertiary} style={{ marginLeft: SPACING.md }} />
              <Text style={styles.meta}>{item.install_count} installs</Text>
            </View>
            <TouchableOpacity
              style={styles.installBtn}
              onPress={() => handleInstall(item)}
              disabled={installing === item.id}
              activeOpacity={0.85}
            >
              {installing === item.id
                ? <ActivityIndicator color="#fff" size="small" />
                : <><Ionicons name="add" size={16} color="#fff" /><Text style={styles.installText}>Install</Text></>}
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="albums-outline" size={40} color={c.textTertiary} />
              <Text style={styles.emptyText}>No templates yet. Be the first to publish one!</Text>
            </View>
          ) : null
        }
      />

      {/* Publish modal */}
      <Modal visible={pubOpen} transparent animationType="slide" onRequestClose={() => setPubOpen(false)}>
        <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={() => setPubOpen(false)}>
          <TouchableOpacity style={styles.sheet} activeOpacity={1} onPress={() => {}}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Publish your categories</Text>
            <TextInput
              style={styles.input}
              placeholder="Template name (e.g. Home Cook Starter)"
              placeholderTextColor={c.textTertiary}
              value={pubName}
              onChangeText={setPubName}
            />
            <TextInput
              style={[styles.input, styles.inputMulti]}
              placeholder="Short description (optional)"
              placeholderTextColor={c.textTertiary}
              value={pubDesc}
              onChangeText={setPubDesc}
              multiline
            />
            <TouchableOpacity
              style={[styles.publishBtn, (!pubName.trim() || publishing) && styles.publishBtnDisabled]}
              onPress={handlePublish}
              disabled={!pubName.trim() || publishing}
              activeOpacity={0.85}
            >
              {publishing ? <ActivityIndicator color="#fff" /> : <Text style={styles.publishBtnText}>Publish</Text>}
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const makeStyles = (c: ColorScheme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  list: { padding: SPACING.md, flexGrow: 1 },

  publishCard: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: c.white, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md, ...SHADOW.sm,
  },
  publishIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.primaryLight, alignItems: 'center', justifyContent: 'center' },
  publishTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: c.text },
  publishSub: { fontSize: FONT_SIZE.xs, color: c.textTertiary, marginTop: 2 },
  msg: { fontSize: FONT_SIZE.sm, color: c.primary, fontWeight: '600', marginBottom: SPACING.md, textAlign: 'center' },

  card: { backgroundColor: c.white, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOW.sm },
  name: { fontSize: FONT_SIZE.lg, fontWeight: '800', color: c.text },
  desc: { fontSize: FONT_SIZE.sm, color: c.textSecondary, marginTop: 4, lineHeight: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: SPACING.sm },
  meta: { fontSize: FONT_SIZE.xs, color: c.textTertiary },
  installBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: c.primary, borderRadius: BORDER_RADIUS.md, paddingVertical: 10, marginTop: SPACING.md,
  },
  installText: { color: '#fff', fontSize: FONT_SIZE.sm, fontWeight: '700' },

  empty: { alignItems: 'center', paddingTop: SPACING.xxl, gap: SPACING.md, paddingHorizontal: SPACING.xl },
  emptyText: { fontSize: FONT_SIZE.sm, color: c.textSecondary, textAlign: 'center' },

  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: c.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.md, paddingBottom: 32 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: 'center', marginBottom: SPACING.md },
  sheetTitle: { fontSize: FONT_SIZE.lg, fontWeight: '800', color: c.text, marginBottom: SPACING.md },
  input: {
    backgroundColor: c.white, borderRadius: BORDER_RADIUS.md, borderWidth: 1.5, borderColor: c.border,
    padding: SPACING.md, fontSize: FONT_SIZE.md, color: c.text, marginBottom: SPACING.sm,
  },
  inputMulti: { minHeight: 70, textAlignVertical: 'top' },
  publishBtn: { backgroundColor: c.primary, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, alignItems: 'center', marginTop: SPACING.xs },
  publishBtnDisabled: { backgroundColor: c.border },
  publishBtnText: { color: '#fff', fontSize: FONT_SIZE.md, fontWeight: '700' },
});
