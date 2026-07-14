import { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../src/store/auth';
import { useLibraryStore } from '../../src/store/library';
import { createSaveFromShare } from '../../src/lib/api/saveItem';
import { useColors } from '../../src/hooks/useColors';
import { SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW, TAB_BAR_HEIGHT, type ColorScheme } from '../../src/constants';

type Mode = 'url' | 'text' | 'image';

const MODES: { id: Mode; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { id: 'url', label: 'Link', icon: 'link-outline' },
  { id: 'text', label: 'Text', icon: 'create-outline' },
  { id: 'image', label: 'Image', icon: 'image-outline' },
];

export default function AddScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [mode, setMode] = useState<Mode>('url');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const { session } = useAuthStore();
  const { addItem } = useLibraryStore();

  async function handleAdd() {
    if (!input.trim() || !session) return;
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const payload = mode === 'url' ? { url: input } : { text: input };
      const item = await createSaveFromShare(payload, session.user.id);
      addItem(item);
      setInput('');
      setSuccessMsg('Saved! Your item is being analyzed.');
    } catch {
      setErrorMsg('Failed to save. Check the URL and try again.');
    }
    setLoading(false);
  }

  async function handleImagePick() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] });
    if (!result.canceled) {
      setErrorMsg('Image upload coming in next sprint — stay tuned!');
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <Text style={styles.title}>Add Content</Text>
          <Text style={styles.subtitle}>Save a link, text snippet, or image.</Text>
        </View>

        {/* Mode selector */}
        <View style={styles.modeRow}>
          {MODES.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[styles.modeTab, mode === m.id && styles.modeTabActive]}
              onPress={() => { setMode(m.id); setInput(''); setErrorMsg(''); setSuccessMsg(''); }}
              activeOpacity={0.85}
            >
              <Ionicons name={m.icon} size={18} color={mode === m.id ? c.primary : c.textSecondary} />
              <Text style={[styles.modeTabText, mode === m.id && styles.modeTabTextActive]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Input area */}
        <View style={styles.inputCard}>
          {mode === 'image' ? (
            <TouchableOpacity style={styles.imageBox} onPress={handleImagePick} activeOpacity={0.85}>
              <View style={styles.imageIcon}>
                <Ionicons name="cloud-upload-outline" size={32} color={c.primary} />
              </View>
              <Text style={styles.imageLabel}>Tap to select an image</Text>
              <Text style={styles.imageSub}>JPEG, PNG, WEBP supported</Text>
            </TouchableOpacity>
          ) : (
            <>
              <Text style={styles.inputLabel}>
                {mode === 'url' ? 'Paste a URL' : 'Paste or type content'}
              </Text>
              <TextInput
                style={[styles.input, mode === 'text' && styles.inputMultiline]}
                placeholder={mode === 'url' ? 'https://instagram.com/p/...' : 'Write or paste text here…'}
                placeholderTextColor={c.textTertiary}
                value={input}
                onChangeText={(t) => { setInput(t); setErrorMsg(''); setSuccessMsg(''); }}
                multiline={mode === 'text'}
                numberOfLines={mode === 'text' ? 6 : 1}
                autoCapitalize="none"
                keyboardType={mode === 'url' ? 'url' : 'default'}
              />
            </>
          )}
        </View>

        {/* Feedback */}
        {successMsg ? (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle" size={16} color={c.success} />
            <Text style={styles.successText}>{successMsg}</Text>
          </View>
        ) : null}
        {errorMsg ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={c.danger} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {mode !== 'image' && (
          <TouchableOpacity
            style={[styles.btn, (!input.trim() || loading) && styles.btnDisabled]}
            onPress={handleAdd}
            disabled={!input.trim() || loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <>
                  <Ionicons name="bookmark-outline" size={18} color="#fff" />
                  <Text style={styles.btnText}>Save to Library</Text>
                </>
            }
          </TouchableOpacity>
        )}

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Quick tips</Text>
          {[
            { icon: 'share-social-outline' as const, text: 'Share directly from Instagram, TikTok, or YouTube' },
            { icon: 'sparkles-outline' as const, text: 'AI will extract key info automatically' },
            { icon: 'folder-open-outline' as const, text: 'Items are auto-sorted into your categories' },
          ].map((tip, i) => (
            <View key={i} style={styles.tip}>
              <Ionicons name={tip.icon} size={15} color={c.primary} />
              <Text style={styles.tipText}>{tip.text}</Text>
            </View>
          ))}
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: ColorScheme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  scroll: { flexGrow: 1, paddingBottom: TAB_BAR_HEIGHT + 16 },

  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingHorizontal: SPACING.md, paddingBottom: SPACING.md,
  },
  title: { fontSize: 28, fontWeight: '800', color: c.text, letterSpacing: -0.5 },
  subtitle: { fontSize: FONT_SIZE.sm, color: c.textSecondary, marginTop: 4 },

  modeRow: {
    flexDirection: 'row', gap: SPACING.sm,
    paddingHorizontal: SPACING.md, marginBottom: SPACING.md,
  },
  modeTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: BORDER_RADIUS.md,
    backgroundColor: c.white, borderWidth: 1.5, borderColor: c.border,
    ...SHADOW.sm,
  },
  modeTabActive: { backgroundColor: c.primaryLight, borderColor: c.primary },
  modeTabText: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: c.textSecondary },
  modeTabTextActive: { color: c.primary },

  inputCard: {
    marginHorizontal: SPACING.md, backgroundColor: c.white,
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.md,
    marginBottom: SPACING.md, ...SHADOW.sm,
  },
  inputLabel: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: c.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 },
  input: {
    fontSize: FONT_SIZE.md, color: c.text,
    backgroundColor: c.background, borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5, borderColor: c.border,
    padding: SPACING.md,
  },
  inputMultiline: { minHeight: 120, textAlignVertical: 'top' },

  imageBox: { alignItems: 'center', paddingVertical: SPACING.xl, gap: SPACING.sm },
  imageIcon: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: c.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  imageLabel: { fontSize: FONT_SIZE.md, fontWeight: '700', color: c.text },
  imageSub: { fontSize: FONT_SIZE.xs, color: c.textTertiary },

  successBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: SPACING.md, backgroundColor: '#ECFDF5',
    borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md,
  },
  successText: { flex: 1, fontSize: FONT_SIZE.sm, color: c.success, fontWeight: '600' },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: SPACING.md, backgroundColor: '#FEF2F2',
    borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md,
  },
  errorText: { flex: 1, fontSize: FONT_SIZE.sm, color: c.danger },

  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    marginHorizontal: SPACING.md, backgroundColor: c.primary,
    borderRadius: BORDER_RADIUS.md, paddingVertical: 16, marginBottom: SPACING.md,
    ...SHADOW.primary,
  },
  btnDisabled: { backgroundColor: c.border, shadowOpacity: 0 },
  btnText: { color: '#fff', fontSize: FONT_SIZE.md, fontWeight: '700' },

  tipsCard: {
    marginHorizontal: SPACING.md, backgroundColor: c.white,
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, ...SHADOW.sm,
  },
  tipsTitle: { fontSize: FONT_SIZE.sm, fontWeight: '700', color: c.text, marginBottom: SPACING.sm },
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 6 },
  tipText: { flex: 1, fontSize: FONT_SIZE.sm, color: c.textSecondary, lineHeight: 20 },
});
