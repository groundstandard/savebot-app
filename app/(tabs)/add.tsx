import { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAudioRecorder, RecordingPresets, AudioModule, setAudioModeAsync } from 'expo-audio';
import { supabase } from '../../src/lib/supabase';
import type { SavedItem } from '../../src/types';
import { useAuthStore } from '../../src/store/auth';
import { useLibraryStore } from '../../src/store/library';
import { router } from 'expo-router';
import { createSaveFromShare, createSaveFromImage, transcribeAudio } from '../../src/lib/api/saveItem';
import { PaywallRequiredError, FairUseLimitError, canManualAdd } from '../../src/lib/subscription';
import { useSubscriptionStore } from '../../src/store/subscription';
import { successFeedback } from '../../src/lib/haptics';
import { useColors } from '../../src/hooks/useColors';
import { SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW, TAB_BAR_HEIGHT, type ColorScheme } from '../../src/constants';

type Mode = 'url' | 'text' | 'image' | 'voice';

const MODES: { id: Mode; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { id: 'url', label: 'Link', icon: 'link-outline' },
  { id: 'text', label: 'Text', icon: 'create-outline' },
  { id: 'image', label: 'Image', icon: 'image-outline' },
  { id: 'voice', label: 'Voice', icon: 'mic-outline' },
];

const MODE_TIPS: Record<Mode, { title: string; steps: string[]; outcome: string; note?: string }> = {
  url: {
    title: 'How to save a link',
    steps: [
      'Paste an Instagram, TikTok, YouTube, Facebook, or X link above.',
      'Tap Save to Library — AI reads the post and pulls out the key details.',
      'It gets auto-sorted into the right category in your library.',
    ],
    outcome: "You'll get a ✓ Saved alert once it's ready to open.",
    note: "Videos or photos with a short caption may show a “double-check” note — the AI just had less text to go on.",
  },
  text: {
    title: 'How to save a note',
    steps: [
      'Paste or type any note, tip, or idea above.',
      'Tap Save to Library — AI summarizes it and adds tags.',
      'It gets filed into a matching category automatically.',
    ],
    outcome: 'Great for quick thoughts, recipes, or advice you copied.',
  },
  image: {
    title: 'How to save an image',
    steps: [
      'Tap the box above to pick a photo or screenshot.',
      'AI reads any text in the image for you.',
      'The details are organized into your library.',
    ],
    outcome: 'Perfect for infographics, menus, or screenshots.',
    note: 'If an image has little text, the AI describes what it sees — it may add a “double-check” note.',
  },
  voice: {
    title: 'How to dictate a note',
    steps: [
      'Tap the mic and speak your note.',
      'Tap again to stop — it gets transcribed to text.',
      'Review the text, then Save to Library to organize it.',
    ],
    outcome: 'A hands-free way to capture ideas on the go.',
  },
};

type ProgressStatus = 'saving' | 'processing' | 'done' | 'failed' | 'timeout';

/** Poll a save's processing status until the AI pipeline finishes (or times out at 90s). */
async function pollProcessing(itemId: string): Promise<'complete' | 'failed' | 'timeout'> {
  const start = Date.now();
  while (Date.now() - start < 90000) {
    await new Promise((r) => setTimeout(r, 2000));
    const { data } = await supabase.from('saved_items').select('processing_status').eq('id', itemId).single();
    const st = data?.processing_status as string | undefined;
    if (st === 'complete') return 'complete';
    if (st === 'failed') return 'failed';
  }
  return 'timeout';
}

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
  const isPro = useSubscriptionStore((s) => s.isPro);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [progressStatus, setProgressStatus] = useState<ProgressStatus>('saving');
  const [savedItemId, setSavedItemId] = useState<string | null>(null);

  // Shared save flow: show a blocking progress modal, then wait for the AI pipeline
  // to finish (or time out) before switching the modal to a done/failed state.
  async function runSaveWithProgress(create: () => Promise<SavedItem>) {
    setErrorMsg(''); setSuccessMsg(''); setSavedItemId(null);
    setProgressStatus('saving');
    setProgressOpen(true);
    try {
      const item = await create();
      addItem(item);
      setInput('');
      setSavedItemId(item.id);
      setProgressStatus('processing');
      const result = await pollProcessing(item.id);
      successFeedback();
      setProgressStatus(result === 'complete' ? 'done' : result === 'failed' ? 'failed' : 'timeout');
    } catch (e) {
      setProgressOpen(false);
      if (e instanceof PaywallRequiredError) router.push('/upgrade');
      else if (e instanceof FairUseLimitError) setErrorMsg("You've hit this month's limit for Instagram, Facebook, and X saves. It resets next month.");
      else setErrorMsg('Something went wrong. Please try again.');
    }
  }

  async function handleAdd() {
    if (!input.trim() || !session) return;
    // Manual content addition is Pro-only on the free tier (PRD §6).
    if (!canManualAdd(isPro)) { router.push('/upgrade'); return; }
    const uid = session.user.id;
    const payload = mode === 'url' ? { url: input } : { text: input };
    await runSaveWithProgress(() => createSaveFromShare(payload, uid));
  }

  async function handleImagePick() {
    if (!session) return;
    // Manual content addition is Pro-only on the free tier (PRD §6).
    if (!canManualAdd(isPro)) { router.push('/upgrade'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, base64: true });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.base64) { setErrorMsg('Could not read that image. Try another one.'); return; }
    const uid = session.user.id;
    const base64 = asset.base64;
    await runSaveWithProgress(() => createSaveFromImage(base64, uid));
  }

  async function startRecording() {
    if (!session) return;
    // Manual content addition is Pro-only on the free tier (PRD §6).
    if (!canManualAdd(isPro)) { router.push('/upgrade'); return; }
    setErrorMsg(''); setSuccessMsg('');
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) { setErrorMsg('Microphone permission is needed to dictate.'); return; }
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecording(true);
    } catch {
      setErrorMsg('Could not start recording. Please try again.');
    }
  }

  async function stopAndTranscribe() {
    setRecording(false);
    setTranscribing(true);
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri || !session) throw new Error('no recording');
      const text = await transcribeAudio(uri, session.user.id);
      if (text.trim()) {
        setInput(text.trim());
        setMode('text'); // hand off to review + Save
      } else {
        setErrorMsg("Couldn't catch that — try dictating again.");
      }
    } catch {
      setErrorMsg('Transcription failed. Please try again.');
    }
    setTranscribing(false);
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
              onPress={() => { if (recording || transcribing) return; setMode(m.id); setInput(''); setErrorMsg(''); setSuccessMsg(''); }}
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
            <TouchableOpacity style={styles.imageBox} onPress={handleImagePick} activeOpacity={0.85} disabled={loading}>
              <View style={styles.imageIcon}>
                {loading
                  ? <ActivityIndicator color={c.primary} />
                  : <Ionicons name="cloud-upload-outline" size={32} color={c.primary} />}
              </View>
              <Text style={styles.imageLabel}>{loading ? 'Uploading…' : 'Tap to select an image'}</Text>
              <Text style={styles.imageSub}>JPEG, PNG, WEBP · AI reads the text</Text>
            </TouchableOpacity>
          ) : mode === 'voice' ? (
            <TouchableOpacity
              style={styles.imageBox}
              onPress={recording ? stopAndTranscribe : startRecording}
              activeOpacity={0.85}
              disabled={transcribing}
            >
              <View style={[styles.imageIcon, recording && styles.recIcon]}>
                {transcribing
                  ? <ActivityIndicator color={c.primary} />
                  : <Ionicons name={recording ? 'stop' : 'mic'} size={32} color={recording ? c.danger : c.primary} />}
              </View>
              <Text style={styles.imageLabel}>
                {transcribing ? 'Transcribing…' : recording ? 'Recording… tap to stop' : 'Tap to start dictating'}
              </Text>
              <Text style={styles.imageSub}>Speak a note — AI transcribes and organizes it</Text>
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

        {mode !== 'image' && mode !== 'voice' && (
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

        {/* How-to — changes per tab (Link / Text / Image / Voice) */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>{MODE_TIPS[mode].title}</Text>
          {MODE_TIPS[mode].steps.map((step, i) => (
            <View key={i} style={styles.step}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
              <Text style={styles.tipText}>{step}</Text>
            </View>
          ))}
          <View style={styles.outcome}>
            <Ionicons name="sparkles" size={14} color={c.primary} />
            <Text style={styles.outcomeText}>{MODE_TIPS[mode].outcome}</Text>
          </View>
          {MODE_TIPS[mode].note ? (
            <View style={styles.noteRow}>
              <Ionicons name="information-circle-outline" size={13} color={c.textTertiary} />
              <Text style={styles.noteText}>{MODE_TIPS[mode].note}</Text>
            </View>
          ) : null}
        </View>

      </ScrollView>

      {/* Save progress — blocking while the AI pipeline runs; no cancel until it's done. */}
      <Modal
        visible={progressOpen}
        transparent
        animationType="fade"
        onRequestClose={() => { if (progressStatus !== 'saving' && progressStatus !== 'processing') setProgressOpen(false); }}
      >
        <View style={styles.progressScrim}>
          <View style={styles.progressCard}>
            {progressStatus === 'saving' || progressStatus === 'processing' ? (
              <>
                <ActivityIndicator size="large" color={c.primary} />
                <Text style={styles.progressTitle}>
                  {progressStatus === 'saving' ? 'Saving…' : 'Analyzing with AI…'}
                </Text>
                <Text style={styles.progressSub}>
                  {progressStatus === 'saving'
                    ? 'Adding it to your library.'
                    : 'Reading the content and pulling out the key details. This can take a few seconds — please keep the app open.'}
                </Text>
              </>
            ) : progressStatus === 'done' ? (
              <>
                <View style={[styles.progressIcon, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="checkmark-circle" size={40} color={c.success} />
                </View>
                <Text style={styles.progressTitle}>All done!</Text>
                <Text style={styles.progressSub}>Analyzed and sorted into your library.</Text>
                <View style={styles.progressBtns}>
                  <TouchableOpacity style={styles.progressBtnAlt} onPress={() => setProgressOpen(false)} activeOpacity={0.85}>
                    <Text style={styles.progressBtnAltText}>Done</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.progressBtn}
                    onPress={() => { setProgressOpen(false); if (savedItemId) router.push({ pathname: '/item/[id]', params: { id: savedItemId } }); }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.progressBtnText}>View</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : progressStatus === 'failed' ? (
              <>
                <View style={[styles.progressIcon, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="alert-circle" size={40} color={c.danger} />
                </View>
                <Text style={styles.progressTitle}>Analysis didn't finish</Text>
                <Text style={styles.progressSub}>It's saved — open it to try the analysis again.</Text>
                <View style={styles.progressBtns}>
                  <TouchableOpacity style={styles.progressBtnAlt} onPress={() => setProgressOpen(false)} activeOpacity={0.85}>
                    <Text style={styles.progressBtnAltText}>Close</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.progressBtn}
                    onPress={() => { setProgressOpen(false); if (savedItemId) router.push({ pathname: '/item/[id]', params: { id: savedItemId } }); }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.progressBtnText}>Open</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View style={[styles.progressIcon, { backgroundColor: c.primaryLight }]}>
                  <Ionicons name="time-outline" size={40} color={c.primary} />
                </View>
                <Text style={styles.progressTitle}>Still analyzing…</Text>
                <Text style={styles.progressSub}>Taking a bit longer — it'll finish in the background and you'll get a ✓ Saved alert.</Text>
                <View style={styles.progressBtns}>
                  <TouchableOpacity style={styles.progressBtnAlt} onPress={() => setProgressOpen(false)} activeOpacity={0.85}>
                    <Text style={styles.progressBtnAltText}>Close</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.progressBtn}
                    onPress={() => { setProgressOpen(false); if (savedItemId) router.push({ pathname: '/item/[id]', params: { id: savedItemId } }); }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.progressBtnText}>View</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  recIcon: { backgroundColor: '#FEE2E2' },
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
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, paddingVertical: 6 },
  stepNum: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: c.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  stepNumText: { fontSize: FONT_SIZE.xs, fontWeight: '800', color: c.primary },
  outcome: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    marginTop: SPACING.sm, paddingTop: SPACING.sm,
    borderTopWidth: 1, borderTopColor: c.border,
  },
  outcomeText: { flex: 1, fontSize: FONT_SIZE.xs, color: c.textSecondary, fontStyle: 'italic', lineHeight: 18 },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: SPACING.sm },
  noteText: { flex: 1, fontSize: FONT_SIZE.xs, color: c.textTertiary, lineHeight: 17 },

  progressScrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  progressCard: {
    width: '100%', maxWidth: 340, backgroundColor: c.white, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl, alignItems: 'center', gap: SPACING.sm, ...SHADOW.sm,
  },
  progressIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xs },
  progressTitle: { fontSize: FONT_SIZE.lg, fontWeight: '800', color: c.text, textAlign: 'center' },
  progressSub: { fontSize: FONT_SIZE.sm, color: c.textSecondary, textAlign: 'center', lineHeight: 20 },
  progressBtns: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md, alignSelf: 'stretch' },
  progressBtn: { flex: 1, backgroundColor: c.primary, borderRadius: BORDER_RADIUS.md, paddingVertical: 12, alignItems: 'center' },
  progressBtnText: { color: '#fff', fontSize: FONT_SIZE.md, fontWeight: '700' },
  progressBtnAlt: { flex: 1, backgroundColor: c.surfaceAlt, borderRadius: BORDER_RADIUS.md, paddingVertical: 12, alignItems: 'center' },
  progressBtnAltText: { color: c.text, fontSize: FONT_SIZE.md, fontWeight: '700' },
});
