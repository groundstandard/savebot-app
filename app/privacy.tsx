import { useState, useMemo } from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { supabase } from '../src/lib/supabase';
import { useAuthStore } from '../src/store/auth';
import { useColors } from '../src/hooks/useColors';
import { SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW, type ColorScheme } from '../src/constants';

export default function Privacy() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { user, fetchUser } = useAuthStore();
  const [isPublic, setIsPublic] = useState(!!user?.profile_public);
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);

  async function togglePublic(v: boolean) {
    if (!user) return;
    setIsPublic(v);
    const { error } = await supabase.from('users').update({ profile_public: v }).eq('id', user.id);
    if (error) { setIsPublic(!v); setMsg(error.message); return; }
    fetchUser();
  }

  async function changePassword() {
    if (!user?.email) return;
    setSending(true); setMsg('');
    const { error } = await supabase.auth.resetPasswordForEmail(user.email);
    setSending(false);
    setMsg(error ? error.message : `Password reset link sent to ${user.email}.`);
  }

  return (
    <View style={styles.root}>
      <ScreenHeader title="Privacy & security" />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.card}>
          <View style={[styles.row, styles.divider]}>
            <View style={styles.rowIcon}><Ionicons name="globe-outline" size={18} color={c.primary} /></View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Public profile</Text>
              <Text style={styles.rowDesc}>Let others discover your shared collections.</Text>
            </View>
            <Switch value={isPublic} onValueChange={togglePublic} trackColor={{ true: c.primary, false: '#D1D5DB' }} thumbColor="#fff" />
          </View>

          <TouchableOpacity style={styles.row} onPress={changePassword} disabled={sending} activeOpacity={0.7}>
            <View style={styles.rowIcon}><Ionicons name="key-outline" size={18} color={c.primary} /></View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{sending ? 'Sending…' : 'Change password'}</Text>
              <Text style={styles.rowDesc}>Email me a secure reset link.</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={c.textTertiary} />
          </TouchableOpacity>
        </View>

        {msg ? <Text style={styles.msg}>{msg}</Text> : null}
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
  msg: { fontSize: FONT_SIZE.sm, color: c.textSecondary, textAlign: 'center', marginTop: SPACING.md },
});
