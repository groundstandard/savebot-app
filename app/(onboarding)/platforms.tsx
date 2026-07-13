import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../../src/constants';

const PLATFORMS = [
  { label: 'Instagram', emoji: '📸', value: 'instagram' },
  { label: 'TikTok', emoji: '🎵', value: 'tiktok' },
  { label: 'YouTube', emoji: '▶️', value: 'youtube' },
  { label: 'Facebook', emoji: '👥', value: 'facebook' },
  { label: 'X (Twitter)', emoji: '🐦', value: 'x' },
];

export default function PlatformsScreen() {
  const params = useLocalSearchParams<{ interests: string }>();
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(value: string) {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]
    );
  }

  function handleNext() {
    router.push({
      pathname: '/(onboarding)/finish',
      params: { interests: params.interests, platforms: selected.join(',') },
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.step}>2 of 3</Text>
        <Text style={styles.title}>What platforms do you use most?</Text>
        <Text style={styles.subtitle}>We'll prioritize these in your experience.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {PLATFORMS.map((p) => {
          const active = selected.includes(p.value);
          return (
            <TouchableOpacity
              key={p.value}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => toggle(p.value)}
            >
              <Text style={styles.chipEmoji}>{p.emoji}</Text>
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{p.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <TouchableOpacity style={styles.button} onPress={handleNext}>
        <Text style={styles.buttonText}>Next →</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.skip}
        onPress={() => router.push({ pathname: '/(onboarding)/finish', params: { interests: params.interests, platforms: '' } })}
      >
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
