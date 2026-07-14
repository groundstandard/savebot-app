import { useEffect, useState, useMemo } from 'react';
import { View, Text, Switch, StyleSheet, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { useColors } from '../src/hooks/useColors';
import { SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW, type ColorScheme } from '../src/constants';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const OPTIONS: { key: string; icon: IconName; title: string; desc: string; def: boolean }[] = [
  { key: 'save_done', icon: 'checkmark-circle-outline', title: 'Save confirmations', desc: 'Notify me when a save finishes processing.', def: true },
  { key: 'digest', icon: 'newspaper-outline', title: 'Weekly digest', desc: 'A weekly summary of what I saved.', def: true },
  { key: 'reminders', icon: 'alarm-outline', title: 'Reminders', desc: 'Nudge me to revisit things I saved.', def: false },
];
const STORAGE_KEY = 'savebot:notif_prefs';

export default function Notifications() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [prefs, setPrefs] = useState<Record<string, boolean>>(
    () => Object.fromEntries(OPTIONS.map((o) => [o.key, o.def])),
  );

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) { try { setPrefs((p) => ({ ...p, ...JSON.parse(raw) })); } catch { /* ignore */ } }
    });
  }, []);

  function toggle(key: string, val: boolean) {
    const next = { ...prefs, [key]: val };
    setPrefs(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  return (
    <View style={styles.root}>
      <ScreenHeader title="Notifications" />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.card}>
          {OPTIONS.map((o, i) => (
            <View key={o.key} style={[styles.row, i < OPTIONS.length - 1 && styles.divider]}>
              <View style={styles.rowIcon}><Ionicons name={o.icon} size={18} color={c.primary} /></View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{o.title}</Text>
                <Text style={styles.rowDesc}>{o.desc}</Text>
              </View>
              <Switch
                value={prefs[o.key]}
                onValueChange={(v) => toggle(o.key, v)}
                trackColor={{ true: c.primary, false: '#D1D5DB' }}
                thumbColor="#fff"
              />
            </View>
          ))}
        </View>
        <Text style={styles.note}>Preferences are saved on this device.</Text>
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: ColorScheme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  body: { padding: SPACING.lg },
  card: { backgroundColor: c.white, borderRadius: BORDER_RADIUS.lg, ...SHADOW.sm, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: SPACING.sm },
  divider: { borderBottomWidth: 1, borderBottomColor: c.border },
  rowIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: c.primaryLight, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1 },
  rowTitle: { fontSize: FONT_SIZE.md, fontWeight: '600', color: c.text },
  rowDesc: { fontSize: FONT_SIZE.xs, color: c.textTertiary, marginTop: 2 },
  note: { fontSize: FONT_SIZE.xs, color: c.textTertiary, textAlign: 'center', marginTop: SPACING.md },
});
