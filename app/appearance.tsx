import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW } from '../src/constants';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const OPTIONS: { key: string; icon: IconName; label: string; desc: string }[] = [
  { key: 'system', icon: 'phone-portrait-outline', label: 'System', desc: 'Match my device setting.' },
  { key: 'light', icon: 'sunny-outline', label: 'Light', desc: 'Always light.' },
  { key: 'dark', icon: 'moon-outline', label: 'Dark', desc: 'Always dark.' },
];
const STORAGE_KEY = 'savebot:theme';

export default function Appearance() {
  const [theme, setTheme] = useState('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => { if (v) setTheme(v); });
  }, []);

  function pick(key: string) {
    setTheme(key);
    AsyncStorage.setItem(STORAGE_KEY, key);
  }

  return (
    <View style={styles.root}>
      <ScreenHeader title="Appearance" />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.card}>
          {OPTIONS.map((o, i) => {
            const active = theme === o.key;
            return (
              <TouchableOpacity key={o.key} style={[styles.row, i < OPTIONS.length - 1 && styles.divider]} onPress={() => pick(o.key)} activeOpacity={0.7}>
                <View style={styles.rowIcon}><Ionicons name={o.icon} size={18} color={COLORS.primary} /></View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{o.label}</Text>
                  <Text style={styles.rowDesc}>{o.desc}</Text>
                </View>
                {active && <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />}
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.note}>Saved on this device. Dark theme rolls out in a later update.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  body: { padding: SPACING.lg },
  card: { backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg, ...SHADOW.sm, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: SPACING.sm },
  divider: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1 },
  rowTitle: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.text },
  rowDesc: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, marginTop: 2 },
  note: { fontSize: FONT_SIZE.xs, color: COLORS.textTertiary, textAlign: 'center', marginTop: SPACING.md },
});
