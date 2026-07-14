import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { useThemeStore, type ThemeMode } from '../src/store/theme';
import { useColors } from '../src/hooks/useColors';
import { SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW, type ColorScheme } from '../src/constants';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const OPTIONS: { key: ThemeMode; icon: IconName; label: string; desc: string }[] = [
  { key: 'system', icon: 'phone-portrait-outline', label: 'System', desc: 'Match my device setting.' },
  { key: 'light', icon: 'sunny-outline', label: 'Light', desc: 'Always light.' },
  { key: 'dark', icon: 'moon-outline', label: 'Dark', desc: 'Always dark.' },
];

export default function Appearance() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  return (
    <View style={styles.root}>
      <ScreenHeader title="Appearance" />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.card}>
          {OPTIONS.map((o, i) => {
            const active = mode === o.key;
            return (
              <TouchableOpacity key={o.key} style={[styles.row, i < OPTIONS.length - 1 && styles.divider]} onPress={() => setMode(o.key)} activeOpacity={0.7}>
                <View style={styles.rowIcon}><Ionicons name={o.icon} size={18} color={c.primary} /></View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{o.label}</Text>
                  <Text style={styles.rowDesc}>{o.desc}</Text>
                </View>
                {active && <Ionicons name="checkmark-circle" size={22} color={c.primary} />}
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.note}>Applies across the whole app and is saved on this device.</Text>
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: ColorScheme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  body: { padding: SPACING.lg },
  card: { backgroundColor: c.card, borderRadius: BORDER_RADIUS.lg, ...SHADOW.sm, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: SPACING.sm },
  divider: { borderBottomWidth: 1, borderBottomColor: c.border },
  rowIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: c.primaryLight, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1 },
  rowTitle: { fontSize: FONT_SIZE.md, fontWeight: '600', color: c.text },
  rowDesc: { fontSize: FONT_SIZE.xs, color: c.textTertiary, marginTop: 2 },
  note: { fontSize: FONT_SIZE.xs, color: c.textTertiary, textAlign: 'center', marginTop: SPACING.md },
});
