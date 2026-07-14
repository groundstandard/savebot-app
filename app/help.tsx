import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW } from '../src/constants';

const FAQS = [
  { q: 'How do I save something?', a: 'Share a post from any app to SaveBot, or tap the + button to add text, a link, or a photo.' },
  { q: 'Where do my saves go?', a: 'Everything lands in your Library, auto-sorted into categories you can rename or reorganize any time.' },
  { q: 'What does Pro unlock?', a: 'Unlimited saves, all platforms, full AI extraction, and semantic search.' },
];
const SUPPORT_EMAIL = 'support@savebot.app';

export default function Help() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <View style={styles.root}>
      <ScreenHeader title="Help & support" />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.section}>FAQ</Text>
        <View style={styles.card}>
          {FAQS.map((f, i) => (
            <TouchableOpacity key={i} style={[styles.row, i < FAQS.length - 1 && styles.divider]} onPress={() => setOpen(open === i ? null : i)} activeOpacity={0.7}>
              <View style={{ flex: 1 }}>
                <View style={styles.qRow}>
                  <Text style={styles.q}>{f.q}</Text>
                  <Ionicons name={open === i ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textTertiary} />
                </View>
                {open === i && <Text style={styles.a}>{f.a}</Text>}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.section}>Contact</Text>
        <TouchableOpacity style={styles.card} onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} activeOpacity={0.7}>
          <View style={styles.row}>
            <View style={styles.rowIcon}><Ionicons name="mail-outline" size={18} color={COLORS.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Email us</Text>
              <Text style={styles.a}>{SUPPORT_EMAIL}</Text>
            </View>
            <Ionicons name="open-outline" size={18} color={COLORS.textTertiary} />
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  body: { padding: SPACING.lg },
  section: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: COLORS.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: SPACING.sm },
  card: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg, ...SHADOW.sm, overflow: 'hidden', marginBottom: SPACING.md },
  row: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: SPACING.sm },
  divider: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  qRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  q: { flex: 1, fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.text },
  a: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 6, lineHeight: 20 },
  rowIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.text },
});
