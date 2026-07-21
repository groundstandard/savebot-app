import { useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import { SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW, type ColorScheme } from '../../constants';

const STEPS: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }[] = [
  { icon: 'share-outline', title: 'Share to SaveBot', text: 'Open any post on Instagram, TikTok, or YouTube and tap Share → SaveBot.' },
  { icon: 'sparkles-outline', title: 'AI does the work', text: 'It extracts the key details and files the save into the right category.' },
  { icon: 'albums-outline', title: 'Find it later', text: 'Everything lands in your library — searchable and neatly organized.' },
];

/** First-run guidance shown once over the empty library. */
export function TutorialOverlay({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss} statusBarTranslucent>
      <View style={styles.scrim}>
        <View style={styles.card}>
          <View style={styles.iconBubble}>
            <Ionicons name="rocket-outline" size={26} color={c.primary} />
          </View>
          <Text style={styles.title}>Welcome to SaveBot</Text>
          <Text style={styles.subtitle}>Share a post from Instagram to get started — here's how it works.</Text>

          <View style={styles.steps}>
            {STEPS.map((s, i) => (
              <View key={s.title} style={styles.step}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{i + 1}</Text>
                </View>
                <View style={styles.stepBody}>
                  <Text style={styles.stepTitle}>{s.title}</Text>
                  <Text style={styles.stepText}>{s.text}</Text>
                </View>
                <Ionicons name={s.icon} size={18} color={c.textTertiary} />
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.button} onPress={onDismiss} activeOpacity={0.9}>
            <Text style={styles.buttonText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (c: ColorScheme) => StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  card: {
    backgroundColor: c.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOW.md,
  },
  iconBubble: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: c.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  title: { fontSize: FONT_SIZE.xxl, fontWeight: '800', color: c.text, letterSpacing: -0.5 },
  subtitle: { fontSize: FONT_SIZE.md, color: c.textSecondary, lineHeight: 21, marginTop: SPACING.xs },

  steps: { marginTop: SPACING.lg, gap: SPACING.md },
  step: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  stepNum: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { color: c.white, fontSize: FONT_SIZE.sm, fontWeight: '800' },
  stepBody: { flex: 1 },
  stepTitle: { fontSize: FONT_SIZE.md, fontWeight: '700', color: c.text },
  stepText: { fontSize: FONT_SIZE.sm, color: c.textSecondary, lineHeight: 19, marginTop: 1 },

  button: {
    marginTop: SPACING.xl,
    backgroundColor: c.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  buttonText: { color: c.white, fontSize: FONT_SIZE.md, fontWeight: '700' },
});
