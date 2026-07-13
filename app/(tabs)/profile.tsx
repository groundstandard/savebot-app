import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/auth';
import { useLibraryStore } from '../../src/store/library';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW, TAB_BAR_HEIGHT } from '../../src/constants';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function SettingsRow({ icon, label, value, onPress, danger }: {
  icon: IconName; label: string; value?: string; onPress?: () => void; danger?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        <Ionicons name={icon} size={18} color={danger ? COLORS.danger : COLORS.primary} />
      </View>
      <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
      <View style={styles.rowRight}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        {!danger && <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />}
      </View>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();
  const { items } = useLibraryStore();

  const isPro = user?.subscription_tier === 'pro';
  const initial = user?.display_name?.[0]?.toUpperCase() ?? '?';
  const totalSaves = items.length;
  const favorites = items.filter(i => i.is_favorite).length;
  const platforms = [...new Set(items.map(i => i.source_platform).filter(Boolean))].length;

  function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
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
          <Ionicons name={isPro ? 'star' : 'person-outline'} size={12} color={isPro ? '#92400E' : COLORS.textSecondary} />
          <Text style={[styles.badgeText, isPro && styles.badgeTextPro]}>{isPro ? 'Pro' : 'Free Plan'}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsCard}>
        {[
          { label: 'Total saves', value: totalSaves, icon: 'bookmark' as IconName, color: COLORS.primary },
          { label: 'Favorites', value: favorites, icon: 'heart' as IconName, color: '#EC4899' },
          { label: 'Platforms', value: platforms, icon: 'apps' as IconName, color: COLORS.success },
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
        <TouchableOpacity style={styles.upgradeCard} activeOpacity={0.9}>
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
          <SettingsRow icon="person-outline" label="Edit profile" />
          <View style={styles.divider} />
          <SettingsRow icon="notifications-outline" label="Notifications" />
          <View style={styles.divider} />
          <SettingsRow icon="lock-closed-outline" label="Privacy & security" />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App</Text>
        <View style={styles.sectionCard}>
          <SettingsRow icon="color-palette-outline" label="Appearance" value="System" />
          <View style={styles.divider} />
          <SettingsRow icon="help-circle-outline" label="Help & support" />
          <View style={styles.divider} />
          <SettingsRow icon="information-circle-outline" label="About SaveBot" value="v1.0.0" />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionCard}>
          <SettingsRow icon="log-out-outline" label="Sign out" onPress={handleSignOut} danger />
        </View>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: TAB_BAR_HEIGHT + 16 },

  heroCard: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.xl,
  },
  avatarWrap: {
    width: 88, height: 88, borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.md,
    ...SHADOW.primary,
  },
  avatarText: { fontSize: 36, fontWeight: '800', color: '#fff' },
  name: { fontSize: FONT_SIZE.xxl, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  email: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, marginTop: 4, marginBottom: SPACING.md },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.surfaceAlt,
  },
  badgePro: { backgroundColor: '#FEF3C7' },
  badgeText: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: COLORS.textSecondary },
  badgeTextPro: { color: '#92400E' },

  statsCard: {
    flexDirection: 'row', marginHorizontal: SPACING.md,
    backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md, ...SHADOW.sm,
  },
  stat: { flex: 1, alignItems: 'center', paddingVertical: SPACING.lg },
  statBorder: { borderRightWidth: 1, borderRightColor: COLORS.border },
  statIcon: { marginBottom: 4 },
  statValue: { fontSize: FONT_SIZE.xxl, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  statLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, marginTop: 2, fontWeight: '500' },

  upgradeCard: {
    marginHorizontal: SPACING.md, marginBottom: SPACING.md,
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.lg,
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
  sectionTitle: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: COLORS.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginHorizontal: SPACING.md, marginBottom: 8 },
  sectionCard: {
    marginHorizontal: SPACING.md, backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg, ...SHADOW.sm, overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 14 },
  rowIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center',
    marginRight: SPACING.md,
  },
  rowIconDanger: { backgroundColor: '#FEF2F2' },
  rowLabel: { flex: 1, fontSize: FONT_SIZE.md, fontWeight: '500', color: COLORS.text },
  rowLabelDanger: { color: COLORS.danger },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowValue: { fontSize: FONT_SIZE.sm, color: COLORS.textTertiary },
  divider: { height: 1, backgroundColor: COLORS.border, marginLeft: 62 },
});
