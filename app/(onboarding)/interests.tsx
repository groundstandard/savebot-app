import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/auth';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../../src/constants';

const OPTIONS = [
  { label: 'Recipes', emoji: '🍳' },
  { label: 'Workouts', emoji: '💪' },
  { label: 'Travel ideas', emoji: '✈️' },
  { label: 'Fashion/Beauty', emoji: '👗' },
  { label: 'Home inspo', emoji: '🏠' },
  { label: 'Product recs', emoji: '🛍️' },
  { label: 'Career tips', emoji: '💼' },
  { label: 'Educational content', emoji: '📚' },
  { label: 'Entertainment recs', emoji: '🎬' },
];

export default function InterestsScreen() {
  const [selected, setSelected] = useState<string[]>([]);
  const { user } = useAuthStore();

  function toggle(label: string) {
    setSelected((prev) =>
      prev.includes(label) ? prev.filter((x) => x !== label) : [...prev, label]
    );
  }

  function handleNext() {
    // Stored in local state, committed at end of onboarding
    router.push({ pathname: '/(onboarding)/platforms', params: { interests: selected.join(',') } });
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.step}>1 of 3</Text>
        <Text style={styles.title}>What do you save most from social media?</Text>
        <Text style={styles.subtitle}>Pick everything that applies.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {OPTIONS.map((opt) => {
          const active = selected.includes(opt.label);
          return (
            <TouchableOpacity
              key={opt.label}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => toggle(opt.label)}
            >
              <Text style={styles.chipEmoji}>{opt.emoji}</Text>
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TouchableOpacity style={styles.button} onPress={handleNext}>
        <Text style={styles.buttonText}>Next →</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.skip} onPress={() => router.push('/(onboarding)/platforms')}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: SPACING.xl, paddingTop: 60 },
  step: { fontSize: FONT_SIZE.sm, color: COLORS.primary, fontWeight: '600', marginBottom: SPACING.xs },
  title: { fontSize: FONT_SIZE.xxl, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.xs },
  subtitle: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: SPACING.md, gap: SPACING.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.full, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md,
  },
  chipActive: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  chipEmoji: { fontSize: 18 },
  chipLabel: { fontSize: FONT_SIZE.sm, color: COLORS.text, fontWeight: '500' },
  chipLabelActive: { color: COLORS.primary, fontWeight: '700' },
  button: {
    margin: SPACING.xl, backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md, padding: SPACING.md, alignItems: 'center',
  },
  buttonText: { color: COLORS.white, fontSize: FONT_SIZE.md, fontWeight: '700' },
  skip: { alignItems: 'center', paddingBottom: SPACING.xl },
  skipText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm },
});
