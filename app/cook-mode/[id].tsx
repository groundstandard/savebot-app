import { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, useWindowDimensions, Animated,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../../src/constants';
import type { SavedItem, RecipeData } from '../../src/types';

export default function CookModeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<SavedItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [servings, setServings] = useState(1);
  const { width } = useWindowDimensions();

  useEffect(() => {
    supabase.from('saved_items').select('*').eq('id', id).single().then(({ data }) => {
      setItem(data as SavedItem);
      const recipe = data?.structured_data as RecipeData | null;
      setServings(recipe?.servings ?? 1);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <View style={styles.centered}><ActivityIndicator color={COLORS.primary} size="large" /></View>;

  const recipe = item?.structured_data as RecipeData | null;
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
  const steps = recipe.instructions;

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
      <Text style={styles.stepProgress}>Step {currentStep + 1} of {steps.length}</Text>

      {/* Step */}
      <View style={styles.stepCard}>
        <Text style={styles.stepNumber}>{currentStep + 1}</Text>
        <Text style={styles.stepText}>{steps[currentStep]?.text ?? ''}</Text>
        {steps[currentStep]?.time_minutes && (
          <View style={styles.stepTime}>
            <Text style={styles.stepTimeText}>⏱ {steps[currentStep].time_minutes} min</Text>
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
          <TouchableOpacity
            style={styles.navBtnPrimary}
            onPress={() => setCurrentStep((s) => s + 1)}
          >
            <Text style={styles.navBtnPrimaryText}>Next →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
            <Text style={styles.doneBtnText}>🎉 Done!</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Ingredients reference */}
      <ScrollView style={styles.ingredientsList}>
        <Text style={styles.ingredientsTitle}>Ingredients</Text>
        {recipe.ingredients.map((ing, i) => (
          <Text key={i} style={styles.ingredientRow}>
            • {ing.quantity ? `${(ing.quantity * ratio).toFixed(ing.quantity % 1 === 0 ? 0 : 1)} ` : ''}
            {ing.unit ? `${ing.unit} ` : ''}{ing.item}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SPACING.md },
  errorText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.md },
  backBtn: { backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md, padding: SPACING.md },
  backBtnText: { color: COLORS.white, fontWeight: '700' },
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
  servingBtnText: { color: COLORS.white, fontSize: 20, fontWeight: '700', lineHeight: 24 },
  servingsLabel: { color: COLORS.white, fontSize: FONT_SIZE.sm, fontWeight: '600' },
  recipeName: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.white, paddingHorizontal: SPACING.xl },
  stepProgress: { color: 'rgba(255,255,255,0.5)', fontSize: FONT_SIZE.sm, paddingHorizontal: SPACING.xl, marginTop: 4, marginBottom: SPACING.lg },
  stepCard: {
    margin: SPACING.xl, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl, minHeight: 180,
  },
  stepNumber: {
    fontSize: 48, fontWeight: '900', color: COLORS.primary,
    textAlign: 'center', marginBottom: SPACING.md,
  },
  stepText: { fontSize: FONT_SIZE.xl, color: COLORS.white, lineHeight: 32, textAlign: 'center' },
  stepTime: {
    marginTop: SPACING.md, alignSelf: 'center',
    backgroundColor: 'rgba(99,102,241,0.2)', borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md, paddingVertical: 4,
  },
  stepTimeText: { color: COLORS.primary, fontSize: FONT_SIZE.sm, fontWeight: '600' },
  navRow: { flexDirection: 'row', paddingHorizontal: SPACING.xl, gap: SPACING.sm },
  navBtn: {
    flex: 1, padding: SPACING.md, borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center',
  },
  navBtnDisabled: { opacity: 0.3 },
  navBtnText: { color: COLORS.white, fontWeight: '600' },
  navBtnPrimary: {
    flex: 2, padding: SPACING.md, borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary, alignItems: 'center',
  },
  navBtnPrimaryText: { color: COLORS.white, fontWeight: '700', fontSize: FONT_SIZE.md },
  doneBtn: {
    flex: 2, padding: SPACING.md, borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.success, alignItems: 'center',
  },
  doneBtnText: { color: COLORS.white, fontWeight: '700', fontSize: FONT_SIZE.md },
  ingredientsList: { margin: SPACING.xl, marginTop: SPACING.lg, flex: 1 },
  ingredientsTitle: { color: 'rgba(255,255,255,0.5)', fontSize: FONT_SIZE.xs, fontWeight: '700', marginBottom: SPACING.sm, letterSpacing: 1 },
  ingredientRow: { color: 'rgba(255,255,255,0.8)', fontSize: FONT_SIZE.sm, marginBottom: 6 },
});
