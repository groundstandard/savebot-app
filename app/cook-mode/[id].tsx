import { useEffect, useMemo, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, PanResponder,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { supabase } from '../../src/lib/supabase';
import { useColors } from '../../src/hooks/useColors';
import { SPACING, FONT_SIZE, BORDER_RADIUS, type ColorScheme } from '../../src/constants';
import type { SavedItem, RecipeData } from '../../src/types';

function fmt(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function CookModeScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<SavedItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [servings, setServings] = useState(1);
  const [showIngredients, setShowIngredients] = useState(true);

  // Keep the screen awake — hands are busy in the kitchen.
  useKeepAwake();

  const recipe = (item?.structured_data ?? null) as RecipeData | null;
  const steps = recipe?.instructions ?? [];

  // ── Per-step countdown timer ────────────────────────────────────────────
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [running, setRunning] = useState(false);

  // Reset the timer whenever the step (or the loaded item) changes.
  useEffect(() => {
    const mins = steps[currentStep]?.time_minutes;
    setSecondsLeft(mins ? mins * 60 : null);
    setRunning(false);
  }, [currentStep, item]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tick once per second while running; auto-stop at 0.
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => {
        if (s == null) return s;
        if (s <= 1) { setRunning(false); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [running]);

  // ── Swipe left/right to change steps (PanResponder — no extra native dep) ─
  const stepRef = useRef(0);
  stepRef.current = currentStep;
  const lenRef = useRef(0);
  lenRef.current = steps.length;
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_, g) => {
        if (g.dx <= -50 && stepRef.current < lenRef.current - 1) setCurrentStep((s) => s + 1);
        else if (g.dx >= 50 && stepRef.current > 0) setCurrentStep((s) => s - 1);
      },
    })
  ).current;

  useEffect(() => {
    supabase.from('saved_items').select('*').eq('id', id).single().then(({ data }) => {
      setItem(data as SavedItem);
      const r = data?.structured_data as RecipeData | null;
      setServings(r?.servings ?? 1);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <View style={styles.centered}><ActivityIndicator color={c.primary} size="large" /></View>;

  if (!recipe || recipe.type !== 'recipe') {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>No recipe data available.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const originalServings = recipe.servings ?? 1;
  const ratio = servings / originalServings;
  const step = steps[currentStep];
  const timerDone = secondsLeft === 0;

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.closeText}>✕ Exit Cook Mode</Text>
        </TouchableOpacity>
        <View style={styles.servingsRow}>
          <TouchableOpacity onPress={() => setServings(Math.max(1, servings - 1))} style={styles.servingBtn}>
            <Text style={styles.servingBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.servingsLabel}>{servings} servings</Text>
          <TouchableOpacity onPress={() => setServings(servings + 1)} style={styles.servingBtn}>
            <Text style={styles.servingBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recipe name */}
      <Text style={styles.recipeName}>{recipe.dish_name}</Text>
      <Text style={styles.stepProgress}>Step {currentStep + 1} of {steps.length} · swipe to move</Text>

      {/* Step (swipeable) */}
      <View style={styles.stepCard} {...pan.panHandlers}>
        <Text style={styles.stepNumber}>{currentStep + 1}</Text>
        <Text style={styles.stepText}>{step?.text ?? ''}</Text>

        {/* Per-step timer */}
        {secondsLeft != null && (
          <View style={[styles.timerBox, timerDone && styles.timerBoxDone]}>
            <Text style={[styles.timerText, timerDone && styles.timerTextDone]}>
              {timerDone ? "⏰ Time's up!" : `⏱ ${fmt(secondsLeft)}`}
            </Text>
            <View style={styles.timerBtns}>
              <TouchableOpacity
                style={styles.timerBtn}
                onPress={() => { if (timerDone) { const m = step?.time_minutes ?? 0; setSecondsLeft(m * 60); } setRunning((r) => !r); }}
              >
                <Text style={styles.timerBtnText}>{running ? 'Pause' : timerDone ? 'Restart' : 'Start'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.timerBtnGhost}
                onPress={() => { const m = step?.time_minutes ?? 0; setSecondsLeft(m * 60); setRunning(false); }}
              >
                <Text style={styles.timerBtnGhostText}>Reset</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Nav buttons */}
      <View style={styles.navRow}>
        <TouchableOpacity
          style={[styles.navBtn, currentStep === 0 && styles.navBtnDisabled]}
          onPress={() => setCurrentStep((s) => Math.max(0, s - 1))}
          disabled={currentStep === 0}
        >
          <Text style={styles.navBtnText}>← Prev</Text>
        </TouchableOpacity>
        {currentStep < steps.length - 1 ? (
          <TouchableOpacity style={styles.navBtnPrimary} onPress={() => setCurrentStep((s) => s + 1)}>
            <Text style={styles.navBtnPrimaryText}>Next →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
            <Text style={styles.doneBtnText}>🎉 Done!</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Ingredients reference (collapsible) */}
      <View style={styles.ingredientsWrap}>
        <TouchableOpacity style={styles.ingredientsHeader} onPress={() => setShowIngredients((v) => !v)} activeOpacity={0.7}>
          <Text style={styles.ingredientsTitle}>Ingredients ({recipe.ingredients.length})</Text>
          <Text style={styles.ingredientsToggle}>{showIngredients ? 'Hide ▲' : 'Show ▼'}</Text>
        </TouchableOpacity>
        {showIngredients && (
          <ScrollView style={styles.ingredientsList}>
            {recipe.ingredients.map((ing, i) => (
              <Text key={i} style={styles.ingredientRow}>
                • {ing.quantity ? `${(ing.quantity * ratio).toFixed(ing.quantity % 1 === 0 && ratio % 1 === 0 ? 0 : 1)} ` : ''}
                {ing.unit ? `${ing.unit} ` : ''}{ing.item}
              </Text>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const makeStyles = (c: ColorScheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.md },
  errorText: { color: c.textSecondary, fontSize: FONT_SIZE.md },
  backBtn: { backgroundColor: c.primary, borderRadius: BORDER_RADIUS.md, padding: SPACING.md },
  backBtnText: { color: c.white, fontWeight: '700' },
  topBar: {
    paddingTop: 56, paddingHorizontal: SPACING.xl, paddingBottom: SPACING.sm,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  closeText: { color: 'rgba(255,255,255,0.6)', fontSize: FONT_SIZE.sm },
  servingsRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  servingBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  servingBtnText: { color: c.white, fontSize: 20, fontWeight: '700', lineHeight: 24 },
  servingsLabel: { color: c.white, fontSize: FONT_SIZE.sm, fontWeight: '600' },
  recipeName: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: c.white, paddingHorizontal: SPACING.xl },
  stepProgress: { color: 'rgba(255,255,255,0.5)', fontSize: FONT_SIZE.sm, paddingHorizontal: SPACING.xl, marginTop: 4, marginBottom: SPACING.lg },
  stepCard: {
    margin: SPACING.xl, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl, minHeight: 180,
  },
  stepNumber: {
    fontSize: 48, fontWeight: '900', color: c.primary,
    textAlign: 'center', marginBottom: SPACING.md,
  },
  stepText: { fontSize: FONT_SIZE.xl, color: c.white, lineHeight: 32, textAlign: 'center' },
  timerBox: {
    marginTop: SPACING.lg, alignSelf: 'center', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: 'rgba(99,102,241,0.18)', borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  timerBoxDone: { backgroundColor: 'rgba(34,197,94,0.22)' },
  timerText: { color: c.primary, fontSize: FONT_SIZE.xl, fontWeight: '800', fontVariant: ['tabular-nums'] },
  timerTextDone: { color: '#22C55E' },
  timerBtns: { flexDirection: 'row', gap: SPACING.sm },
  timerBtn: {
    backgroundColor: c.primary, borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg, paddingVertical: 8,
  },
  timerBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZE.sm },
  timerBtnGhost: {
    borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  timerBtnGhostText: { color: 'rgba(255,255,255,0.8)', fontWeight: '600', fontSize: FONT_SIZE.sm },
  navRow: { flexDirection: 'row', paddingHorizontal: SPACING.xl, gap: SPACING.sm },
  navBtn: {
    flex: 1, padding: SPACING.md, borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center',
  },
  navBtnDisabled: { opacity: 0.3 },
  navBtnText: { color: c.white, fontWeight: '600' },
  navBtnPrimary: {
    flex: 2, padding: SPACING.md, borderRadius: BORDER_RADIUS.md,
    backgroundColor: c.primary, alignItems: 'center',
  },
  navBtnPrimaryText: { color: c.white, fontWeight: '700', fontSize: FONT_SIZE.md },
  doneBtn: {
    flex: 2, padding: SPACING.md, borderRadius: BORDER_RADIUS.md,
    backgroundColor: c.success, alignItems: 'center',
  },
  doneBtnText: { color: c.white, fontWeight: '700', fontSize: FONT_SIZE.md },
  ingredientsWrap: { margin: SPACING.xl, marginTop: SPACING.lg, flex: 1 },
  ingredientsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  ingredientsTitle: { color: 'rgba(255,255,255,0.5)', fontSize: FONT_SIZE.xs, fontWeight: '700', letterSpacing: 1 },
  ingredientsToggle: { color: 'rgba(255,255,255,0.5)', fontSize: FONT_SIZE.xs, fontWeight: '700' },
  ingredientsList: { flex: 1 },
  ingredientRow: { color: 'rgba(255,255,255,0.8)', fontSize: FONT_SIZE.sm, marginBottom: 6 },
});
