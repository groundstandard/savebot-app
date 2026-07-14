import { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { supabase } from '../src/lib/supabase';
import { useAuthStore } from '../src/store/auth';
import { useColors } from '../src/hooks/useColors';
import { SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW, type ColorScheme } from '../src/constants';

export default function EditProfile() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { user, fetchUser } = useAuthStore();
  const [name, setName] = useState(user?.display_name ?? '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const initial = (name || user?.email || '?')[0]?.toUpperCase();

  async function save() {
    if (!user) return;
    if (name.trim().length < 2) { setMsg('Name must be at least 2 characters.'); return; }
    setSaving(true); setMsg('');
    const { error } = await supabase.from('users').update({ display_name: name.trim() }).eq('id', user.id);
    setSaving(false);
    if (error) { setMsg(error.message); return; }
    await fetchUser();
    router.back();
  }

  return (
    <View style={styles.root}>
      <ScreenHeader title="Edit profile" />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>

        <Text style={styles.label}>Display name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={(t) => { setName(t); setMsg(''); }}
          placeholder="Your name"
          placeholderTextColor={c.textTertiary}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Email</Text>
        <View style={[styles.input, styles.disabled]}>
          <Text style={styles.disabledText}>{user?.email}</Text>
        </View>
        <Text style={styles.hint}>Email can't be changed here.</Text>

        {msg ? <Text style={styles.err}>{msg}</Text> : null}

        <TouchableOpacity style={[styles.btn, saving && { opacity: 0.7 }]} onPress={save} disabled={saving} activeOpacity={0.85}>
          <Text style={styles.btnText}>{saving ? 'Saving…' : 'Save changes'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: ColorScheme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  body: { padding: SPACING.lg },
  avatar: {
    alignSelf: 'center', width: 88, height: 88, borderRadius: 28,
    backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.xl, ...SHADOW.primary,
  },
  avatarText: { fontSize: 36, fontWeight: '800', color: '#fff' },
  label: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: c.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6, marginTop: SPACING.md },
  input: {
    backgroundColor: c.white, borderRadius: BORDER_RADIUS.md, borderWidth: 1.5, borderColor: c.border,
    paddingHorizontal: SPACING.md, paddingVertical: 14, fontSize: FONT_SIZE.md, color: c.text,
  },
  disabled: { backgroundColor: c.surfaceAlt, justifyContent: 'center' },
  disabledText: { fontSize: FONT_SIZE.md, color: c.textTertiary },
  hint: { fontSize: FONT_SIZE.xs, color: c.textTertiary, marginTop: 5 },
  err: { color: c.danger, fontSize: FONT_SIZE.sm, marginTop: SPACING.md },
  btn: { backgroundColor: c.primary, borderRadius: BORDER_RADIUS.md, paddingVertical: 16, alignItems: 'center', marginTop: SPACING.xl, ...SHADOW.primary },
  btnText: { color: '#fff', fontSize: FONT_SIZE.md, fontWeight: '700' },
});
