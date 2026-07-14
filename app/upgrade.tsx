import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { ConfirmModal } from '../src/components/ConfirmModal';
import { useColors } from '../src/hooks/useColors';
import { SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW, type ColorScheme } from '../src/constants';

const FEATURES = [
  'Unlimited saves',
  'All platforms (Instagram, TikTok, YouTube, Facebook, X)',
  'Full AI extraction & structured cards',
  'Semantic search',
  'Social sharing & public profile',
  'Cook mode & export',
  'No watermarks',
];

export default function Upgrade() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [plan, setPlan] = useState<'annual' | 'monthly'>('annual');
  const [showSoon, setShowSoon] = useState(false);

  return (
    <View style={styles.root}>
      <ScreenHeader title="SaveBot Pro" />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.hero}>
          <View style={styles.badge}><Ionicons name="flash" size={14} color="#F59E0B" /><Text style={styles.badgeText}>PRO</Text></View>
          <Text style={styles.heroTitle}>Unlock everything</Text>
          <Text style={styles.heroSub}>Get the full SaveBot experience.</Text>
        </View>

        <View style={styles.card}>
          {FEATURES.map((f) => (
            <View key={f} style={styles.feat}>
              <Ionicons name="checkmark-circle" size={20} color={c.success} />
              <Text style={styles.featText}>{f}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={[styles.plan, plan === 'annual' && styles.planActive]} onPress={() => setPlan('annual')} activeOpacity={0.8}>
          <View style={{ flex: 1 }}>
            <Text style={styles.planName}>Annual <Text style={styles.save}>save 33%</Text></Text>
            <Text style={styles.planPrice}>$39.99/yr · $3.33/mo</Text>
          </View>
          <Ionicons name={plan === 'annual' ? 'radio-button-on' : 'radio-button-off'} size={22} color={plan === 'annual' ? c.primary : c.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.plan, plan === 'monthly' && styles.planActive]} onPress={() => setPlan('monthly')} activeOpacity={0.8}>
          <View style={{ flex: 1 }}>
            <Text style={styles.planName}>Monthly</Text>
            <Text style={styles.planPrice}>$4.99/mo</Text>
          </View>
          <Ionicons name={plan === 'monthly' ? 'radio-button-on' : 'radio-button-off'} size={22} color={plan === 'monthly' ? c.primary : c.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.cta} onPress={() => setShowSoon(true)} activeOpacity={0.9}>
          <Text style={styles.ctaText}>Start 7-day free trial</Text>
        </TouchableOpacity>
        <Text style={styles.fine}>Then {plan === 'annual' ? '$39.99/yr' : '$4.99/mo'}. Cancel anytime.</Text>
      </ScrollView>

      <ConfirmModal
        visible={showSoon}
        title="Almost there!"
        message="In-app purchases are being finalized and will be available very soon. Thanks for your patience!"
        confirmLabel="Got it"
        cancelLabel="Close"
        onConfirm={() => setShowSoon(false)}
        onCancel={() => setShowSoon(false)}
      />
    </View>
  );
}

const makeStyles = (c: ColorScheme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  body: { padding: SPACING.lg },
  hero: { alignItems: 'center', marginBottom: SPACING.lg },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3C7', borderRadius: BORDER_RADIUS.full, paddingHorizontal: 12, paddingVertical: 4, marginBottom: SPACING.sm },
  badgeText: { fontSize: FONT_SIZE.xs, fontWeight: '800', color: '#92400E', letterSpacing: 1 },
  heroTitle: { fontSize: FONT_SIZE.xxl, fontWeight: '800', color: c.text },
  heroSub: { fontSize: FONT_SIZE.sm, color: c.textSecondary, marginTop: 2 },
  card: { backgroundColor: c.white, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, ...SHADOW.sm, marginBottom: SPACING.lg, gap: SPACING.sm },
  feat: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  featText: { flex: 1, fontSize: FONT_SIZE.sm, color: c.text },
  plan: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.white, borderRadius: BORDER_RADIUS.md, borderWidth: 1.5, borderColor: c.border, padding: SPACING.md, marginBottom: SPACING.sm },
  planActive: { borderColor: c.primary, backgroundColor: c.primaryLight },
  planName: { fontSize: FONT_SIZE.md, fontWeight: '700', color: c.text },
  save: { fontSize: FONT_SIZE.xs, color: c.success, fontWeight: '700' },
  planPrice: { fontSize: FONT_SIZE.sm, color: c.textSecondary, marginTop: 2 },
  cta: { backgroundColor: c.primary, borderRadius: BORDER_RADIUS.md, paddingVertical: 16, alignItems: 'center', marginTop: SPACING.md, ...SHADOW.primary },
  ctaText: { color: '#fff', fontSize: FONT_SIZE.md, fontWeight: '700' },
  fine: { fontSize: FONT_SIZE.xs, color: c.textTertiary, textAlign: 'center', marginTop: SPACING.sm },
});
