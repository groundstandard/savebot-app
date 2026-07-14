import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ConfirmModal } from '../../src/components/ConfirmModal';
import { useAuthStore } from '../../src/store/auth';
import { useLibraryStore } from '../../src/store/library';
import { useColors } from '../../src/hooks/useColors';
import { SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW, TAB_BAR_HEIGHT, type ColorScheme } from '../../src/constants';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function SettingsRow({ icon, label, value, onPress, danger }: {
  icon: IconName; label: string; value?: string; onPress?: () => void; danger?: boolean;
}) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        <Ionicons name={icon} size={18} color={danger ? c.danger : c.primary} />
      </View>
      <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
      <View style={styles.rowRight}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        {!danger && <Ionicons name="chevron-forward" size={16} color={c.textTertiary} />}
      </View>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { user, signOut } = useAuthStore();
  const { items } = useLibraryStore();

  const isPro = user?.subscription_tier === 'pro';
  const initial = user?.display_name?.[0]?.toUpperCase() ?? '?';
  const totalSaves = items.length;
  const favorites = items.filter(i => i.is_favorite).length;
  const platforms = [...new Set(items.map(i => i.source_platform).filter(Boolean))].length;

  const [showSignOut, setShowSignOut] = useState(false);

  async function doSignOut() {
    setShowSignOut(false);
    await signOut();
    router.replace('/(auth)/login');
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

      {/* Profile header */}
      <View style={styles.heroCard}>
        <View style={styles.avatarWrap}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <Text style={styles.name}>{user?.display_name ?? 'User'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={[styles.badge, isPro && styles.badgePro]}>
          <Ionicons name={isPro ? 'star' : 'person-outline'} size={12} color={isPro ? '#92400E' : c.textSecondary} />
          <Text style={[styles.badgeText, isPro && styles.badgeTextPro]}>{isPro ? 'Pro' : 'Free Plan'}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsCard}>
        {[
          { label: 'Total saves', value: totalSaves, icon: 'bookmark' as IconName, color: c.primary },
          { label: 'Favorites', value: favorites, icon: 'heart' as IconName, color: '#EC4899' },
          { label: 'Platforms', value: platforms, icon: 'apps' as IconName, color: c.success },
        ].map((s, i) => (
          <View key={i} style={[styles.stat, i < 2 && styles.statBorder]}>
            <Ionicons name={s.icon} size={16} color={s.color} style={styles.statIcon} />
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Upgrade card */}
      {!isPro && (
        <TouchableOpacity style={styles.upgradeCard} activeOpacity={0.9} onPress={() => router.push('/upgrade')}>
          <View style={styles.upgradeLeft}>
            <View style={styles.upgradeBadge}>
              <Ionicons name="flash" size={14} color="#F59E0B" />
              <Text style={styles.upgradeBadgeText}>PRO</Text>
            </View>
            <Text style={styles.upgradeTitle}>Upgrade to Pro</Text>
            <Text style={styles.upgradeSubtitle}>Unlimited saves · All platforms · AI extraction</Text>
          </View>
          <View style={styles.upgradePrice}>
            <Text style={styles.upgradePriceText}>$4.99</Text>
            <Text style={styles.upgradePriceSub}>/mo</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.sectionCard}>
          <SettingsRow icon="person-outline" label="Edit profile" onPress={() => router.push('/edit-profile')} />
          <View style={styles.divider} />
          <SettingsRow icon="notifications-outline" label="Notifications" onPress={() => router.push('/notifications')} />
          <View style={styles.divider} />
          <SettingsRow icon="lock-closed-outline" label="Privacy & security" onPress={() => router.push('/privacy')} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App</Text>
        <View style={styles.sectionCard}>
          <SettingsRow icon="color-palette-outline" label="Appearance" onPress={() => router.push('/appearance')} />
          <View style={styles.divider} />
          <SettingsRow icon="help-circle-outline" label="Help & support" onPress={() => router.push('/help')} />
          <View style={styles.divider} />
          <SettingsRow icon="information-circle-outline" label="About SaveBot" value="v1.0.0" onPress={() => router.push('/about')} />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionCard}>
          <SettingsRow icon="log-out-outline" label="Sign out" onPress={() => setShowSignOut(true)} danger />
        </View>
      </View>

      <ConfirmModal
        visible={showSignOut}
        title="Sign out"
        message="Are you sure you want to sign out?"
        confirmLabel="Sign out"
        cancelLabel="Cancel"
        danger
        onConfirm={doSignOut}
        onCancel={() => setShowSignOut(false)}
      />

    </ScrollView>
  );
}

const makeStyles = (c: ColorScheme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  scroll: { paddingBottom: TAB_BAR_HEIGHT + 16 },

  heroCard: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.xl,
  },
  avatarWrap: {
    width: 88, height: 88, borderRadius: 28,
    backgroundColor: c.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.md,
    ...SHADOW.primary,
  },
  avatarText: { fontSize: 36, fontWeight: '800', color: '#fff' },
  name: { fontSize: FONT_SIZE.xxl, fontWeight: '800', color: c.text, letterSpacing: -0.5 },
  email: { fontSize: FONT_SIZE.sm, color: c.textSecondary, marginTop: 4, marginBottom: SPACING.md },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: BORDER_RADIUS.full, backgroundColor: c.surfaceAlt,
  },
  badgePro: { backgroundColor: '#FEF3C7' },
  badgeText: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: c.textSecondary },
  badgeTextPro: { color: '#92400E' },

  statsCard: {
    flexDirection: 'row', marginHorizontal: SPACING.md,
    backgroundColor: c.white, borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md, ...SHADOW.sm,
  },
  stat: { flex: 1, alignItems: 'center', paddingVertical: SPACING.lg },
  statBorder: { borderRightWidth: 1, borderRightColor: c.border },
  statIcon: { marginBottom: 4 },
  statValue: { fontSize: FONT_SIZE.xxl, fontWeight: '800', color: c.text, letterSpacing: -0.5 },
  statLabel: { fontSize: FONT_SIZE.xs, color: c.textTertiary, marginTop: 2, fontWeight: '500' },

  upgradeCard: {
    marginHorizontal: SPACING.md, marginBottom: SPACING.md,
    backgroundColor: c.primary, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    ...SHADOW.primary,
  },
  upgradeLeft: { flex: 1 },
  upgradeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BORDER_RADIUS.full, paddingHorizontal: 10, paddingVertical: 3,
    alignSelf: 'flex-start', marginBottom: 8,
  },
  upgradeBadgeText: { fontSize: FONT_SIZE.xs, fontWeight: '800', color: '#FEF3C7', letterSpacing: 1 },
  upgradeTitle: { fontSize: FONT_SIZE.lg, fontWeight: '800', color: '#fff' },
  upgradeSubtitle: { fontSize: FONT_SIZE.xs, color: 'rgba(255,255,255,0.75)', marginTop: 3 },
  upgradePrice: { alignItems: 'flex-end' },
  upgradePriceText: { fontSize: FONT_SIZE.xxl, fontWeight: '900', color: '#fff' },
  upgradePriceSub: { fontSize: FONT_SIZE.xs, color: 'rgba(255,255,255,0.7)', marginTop: -2 },

  section: { marginBottom: SPACING.md },
  sectionTitle: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: c.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginHorizontal: SPACING.md, marginBottom: 8 },
  sectionCard: {
    marginHorizontal: SPACING.md, backgroundColor: c.white,
    borderRadius: BORDER_RADIUS.lg, ...SHADOW.sm, overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 14 },
  rowIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: c.primaryLight, alignItems: 'center', justifyContent: 'center',
    marginRight: SPACING.md,
  },
  rowIconDanger: { backgroundColor: '#FEF2F2' },
  rowLabel: { flex: 1, fontSize: FONT_SIZE.md, fontWeight: '500', color: c.text },
  rowLabelDanger: { color: c.danger },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowValue: { fontSize: FONT_SIZE.sm, color: c.textTertiary },
  divider: { height: 1, backgroundColor: c.border, marginLeft: 62 },
});
