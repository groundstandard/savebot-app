import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/auth';
import { useColors } from '../../src/hooks/useColors';
import { DEFAULT_CATEGORIES, SPACING, FONT_SIZE, BORDER_RADIUS, type ColorScheme } from '../../src/constants';

const USAGE_OPTIONS = [
  { label: 'Just organize my saves', value: 'organize', emoji: '📂' },
  { label: 'Help me actually use what I save', value: 'use', emoji: '✅' },
  { label: 'Both', value: 'both', emoji: '⚡' },
];

const DIETARY_OPTIONS = ['None', 'Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'Keto', 'Halal', 'Kosher'];

const VIBE_OPTIONS = [
  { label: 'Keep it minimal', value: 'minimal', emoji: '🎯' },
  { label: 'Somewhere in between', value: 'balanced', emoji: '⚖️' },
  { label: 'Let the AI do everything', value: 'full', emoji: '🤖' },
];

export default function FinishOnboardingScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const params = useLocalSearchParams<{ interests: string; platforms: string }>();
  const interests = params.interests ? params.interests.split(',').filter(Boolean) : [];
  const showDietary = interests.includes('Recipes');

  const [usageIntent, setUsageIntent] = useState<string | null>(null);
  const [dietary, setDietary] = useState<string[]>([]);
  const [vibe, setVibe] = useState<string>('balanced');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { fetchUser } = useAuthStore();

  function toggleDietary(opt: string) {
    if (opt === 'None') { setDietary(['None']); return; }
    setDietary((prev) => {
      const without = prev.filter((x) => x !== 'None');
      return without.includes(opt) ? without.filter((x) => x !== opt) : [...without, opt];
    });
  }

  async function persist(complete: boolean, preferences: Record<string, unknown> | null) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace('/(auth)/login'); return false; }

    const update: Record<string, unknown> = { onboarding_complete: complete };
    if (preferences) update.onboarding_preferences = preferences;

    const { error } = await supabase.from('users').update(update).eq('id', session.user.id);
    if (error) { setErrorMsg('Could not save preferences. Try again.'); return false; }

    const categoryRows = DEFAULT_CATEGORIES.map((c, i) => ({
      user_id: session.user.id, name: c.name, icon: c.icon,
      sort_order: i, is_default: true, is_hidden: false,
    }));
    await supabase.from('categories').upsert(categoryRows, { onConflict: 'user_id,name' });
    return true;
  }

  async function handleFinish() {
    if (!usageIntent) return;
    setErrorMsg('');
    setLoading(true);
    const preferences = {
      interests,
      platforms: params.platforms ? params.platforms.split(',').filter(Boolean) : [],
      usage_intent: usageIntent,
      dietary_preferences: showDietary ? dietary : [],
      ai_autonomy: vibe,
    };
    const ok = await persist(true, preferences);
    setLoading(false);
    if (ok) { await fetchUser(); router.replace('/(tabs)/library'); }
  }

  async function handleSkip() {
    setErrorMsg('');
    setLoading(true);
    const ok = await persist(true, null);
    setLoading(false);
    if (ok) { await fetchUser(); router.replace('/(tabs)/library'); }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.step}>3 of 3</Text>
          <Text style={styles.title}>A few last things</Text>
        </View>

        {/* Q3 — usage intent */}
        <Text style={styles.question}>How do you want to use SaveBot?</Text>
        <View style={styles.options}>
          {USAGE_OPTIONS.map((opt) => {
            const active = usageIntent === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.option, active && styles.optionActive]}
                onPress={() => setUsageIntent(opt.value)}
                activeOpacity={0.85}
              >
                <Text style={styles.optionEmoji}>{opt.emoji}</Text>
                <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Q4 — dietary (only if Recipes chosen) */}
        {showDietary && (
          <>
            <Text style={styles.question}>Any dietary preferences?</Text>
            <View style={styles.chipGrid}>
              {DIETARY_OPTIONS.map((opt) => {
                const active = dietary.includes(opt);
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => toggleDietary(opt)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* Q5 — AI vibe */}
        <Text style={styles.question}>What's your vibe?</Text>
        <View style={styles.options}>
          {VIBE_OPTIONS.map((opt) => {
            const active = vibe === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.option, active && styles.optionActive]}
                onPress={() => setVibe(opt.value)}
                activeOpacity={0.85}
              >
                <Text style={styles.optionEmoji}>{opt.emoji}</Text>
                <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, (!usageIntent || loading) && styles.buttonDisabled]}
          onPress={handleFinish}
          disabled={!usageIntent || loading}
          activeOpacity={0.9}
        >
          {loading
            ? <ActivityIndicator color={c.white} />
            : <Text style={styles.buttonText}>Get started 🎉</Text>
          }
        </TouchableOpacity>
        <TouchableOpacity style={styles.skip} onPress={handleSkip} disabled={loading}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (c: ColorScheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  scroll: { padding: SPACING.xl, paddingTop: Platform.OS === 'ios' ? 60 : 48, paddingBottom: SPACING.md },
  header: { marginBottom: SPACING.md },
  step: { fontSize: FONT_SIZE.sm, color: c.primary, fontWeight: '600', marginBottom: SPACING.xs },
  title: { fontSize: FONT_SIZE.xxl, fontWeight: '800', color: c.text },
  question: { fontSize: FONT_SIZE.md, fontWeight: '700', color: c.text, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  options: { gap: SPACING.sm },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: c.white, borderWidth: 1.5, borderColor: c.border,
    borderRadius: BORDER_RADIUS.md, padding: SPACING.md,
  },
  optionActive: { backgroundColor: c.primaryLight, borderColor: c.primary },
  optionEmoji: { fontSize: 22 },
  optionLabel: { fontSize: FONT_SIZE.md, color: c.text, fontWeight: '500', flex: 1 },
  optionLabelActive: { color: c.primary, fontWeight: '700' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip: {
    backgroundColor: c.white, borderWidth: 1.5, borderColor: c.border,
    borderRadius: BORDER_RADIUS.full, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md,
  },
  chipActive: { backgroundColor: c.primaryLight, borderColor: c.primary },
  chipLabel: { fontSize: FONT_SIZE.sm, color: c.text, fontWeight: '500' },
  chipLabelActive: { color: c.primary, fontWeight: '700' },
  error: { color: '#EF4444', fontSize: FONT_SIZE.sm, marginTop: SPACING.md },
  footer: { padding: SPACING.xl, paddingTop: SPACING.sm },
  button: {
    backgroundColor: c.primary,
    borderRadius: BORDER_RADIUS.md, padding: SPACING.md, alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: c.border },
  buttonText: { color: c.white, fontSize: FONT_SIZE.md, fontWeight: '700' },
  skip: { alignItems: 'center', paddingTop: SPACING.md },
  skipText: { color: c.textSecondary, fontSize: FONT_SIZE.sm },
});
