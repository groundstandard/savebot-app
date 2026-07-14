import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking } from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { useColors } from '../src/hooks/useColors';
import { SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW, type ColorScheme } from '../src/constants';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const LINKS: { icon: IconName; label: string; url: string }[] = [
  { icon: 'document-text-outline', label: 'Terms of Service', url: 'https://savebot.app/terms' },
  { icon: 'shield-checkmark-outline', label: 'Privacy Policy', url: 'https://savebot.app/privacy' },
  { icon: 'globe-outline', label: 'Website', url: 'https://savebot.app' },
];

export default function About() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <View style={styles.root}>
      <ScreenHeader title="About SaveBot" />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.logo}><Text style={styles.logoText}>S</Text></View>
        <Text style={styles.name}>SaveBot</Text>
        <Text style={styles.tag}>Your saves, actually organized.</Text>
        <Text style={styles.version}>Version {version}</Text>

        <Text style={styles.blurb}>
          SaveBot turns the posts you save across social media into an organized, searchable
          library — recipes, workouts, travel, and more, structured by AI.
        </Text>

        <View style={styles.card}>
          {LINKS.map((l, i) => (
            <TouchableOpacity key={l.label} style={[styles.row, i < LINKS.length - 1 && styles.divider]} onPress={() => Linking.openURL(l.url)} activeOpacity={0.7}>
              <View style={styles.rowIcon}><Ionicons name={l.icon} size={18} color={c.primary} /></View>
              <Text style={styles.rowLabel}>{l.label}</Text>
              <Ionicons name="open-outline" size={18} color={c.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.copyright}>© 2026 SaveBot. All rights reserved.</Text>
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: ColorScheme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  body: { padding: SPACING.lg, alignItems: 'center' },
  logo: { width: 80, height: 80, borderRadius: 24, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', ...SHADOW.primary },
  logoText: { fontSize: 40, fontWeight: '900', color: '#fff' },
  name: { fontSize: FONT_SIZE.xxl, fontWeight: '800', color: c.text, marginTop: SPACING.md },
  tag: { fontSize: FONT_SIZE.sm, color: c.textSecondary, marginTop: 2 },
  version: { fontSize: FONT_SIZE.xs, color: c.textTertiary, marginTop: 6 },
  blurb: { fontSize: FONT_SIZE.sm, color: c.textSecondary, textAlign: 'center', lineHeight: 21, marginVertical: SPACING.xl, paddingHorizontal: SPACING.sm },
  card: { alignSelf: 'stretch', backgroundColor: c.white, borderRadius: BORDER_RADIUS.lg, ...SHADOW.sm, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: SPACING.sm },
  divider: { borderBottomWidth: 1, borderBottomColor: c.border },
  rowIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: c.primaryLight, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: FONT_SIZE.md, fontWeight: '600', color: c.text },
  copyright: { fontSize: FONT_SIZE.xs, color: c.textTertiary, marginTop: SPACING.xl },
});
