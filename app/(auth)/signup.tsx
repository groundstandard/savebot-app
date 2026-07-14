import { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/store/auth';
import { SocialAuthButtons } from '../../src/components/SocialAuthButtons';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import { useColors } from '../../src/hooks/useColors';
import { SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW, type ColorScheme } from '../../src/constants';

export default function SignupScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [nameFocus, setNameFocus] = useState(false);
  const [emailFocus, setEmailFocus] = useState(false);
  const [passFocus, setPassFocus] = useState(false);
  const authenticating = useAuthStore((s) => s.authenticating);

  async function handleSignup() {
    setErrorMsg('');
    if (!name || !email || !password) { setErrorMsg('Please fill in all fields.'); return; }
    if (password.length < 6) { setErrorMsg('Password must be at least 6 characters.'); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name } },
    });
    setLoading(false);
    if (error) { setErrorMsg(error.message); return; }
    if (data.session) useAuthStore.getState().setSession(data.session);
    router.replace('/(onboarding)/interests');
  }

  return (
    <View style={{ flex: 1 }}>
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <View style={styles.hero}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoLetter}>S</Text>
          </View>
          <Text style={styles.appName}>SaveBot</Text>
          <Text style={styles.tagline}>Start organizing your saves today.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create account</Text>
          <Text style={styles.cardSub}>It takes less than a minute.</Text>

          {([
            { label: 'Display name', placeholder: 'How should we call you?', value: name, setter: setName, icon: 'person-outline' as const, focus: nameFocus, setFocus: setNameFocus, type: 'default' as const },
            { label: 'Email', placeholder: 'you@example.com', value: email, setter: setEmail, icon: 'mail-outline' as const, focus: emailFocus, setFocus: setEmailFocus, type: 'email-address' as const },
          ]).map((f) => (
            <View style={styles.field} key={f.label}>
              <Text style={styles.fieldLabel}>{f.label}</Text>
              <View style={[styles.inputRow, f.focus && styles.inputRowFocused]}>
                <Ionicons name={f.icon} size={18} color={f.focus ? c.primary : c.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={f.placeholder}
                  placeholderTextColor={c.textTertiary}
                  value={f.value}
                  onChangeText={(t) => { f.setter(t); setErrorMsg(''); }}
                  keyboardType={f.type}
                  autoCapitalize={f.type === 'email-address' ? 'none' : 'words'}
                  onFocus={() => f.setFocus(true)}
                  onBlur={() => f.setFocus(false)}
                />
              </View>
            </View>
          ))}

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Password</Text>
            <View style={[styles.inputRow, passFocus && styles.inputRowFocused]}>
              <Ionicons name="lock-closed-outline" size={18} color={passFocus ? c.primary : c.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Min. 6 characters"
                placeholderTextColor={c.textTertiary}
                value={password}
                onChangeText={(t) => { setPassword(t); setErrorMsg(''); }}
                secureTextEntry={!showPassword}
                onFocus={() => setPassFocus(true)}
                onBlur={() => setPassFocus(false)}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={c.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={15} color={c.danger} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnLoading]}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <Text style={styles.btnText}>Creating account…</Text>
              : <>
                  <Text style={styles.btnText}>Create account</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
            }
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <SocialAuthButtons onError={setErrorMsg} redirectTo="/" />

          <Link href="/(auth)/login" asChild>
            <TouchableOpacity style={styles.linkRow}>
              <Text style={styles.linkText}>Already have an account? </Text>
              <Text style={styles.linkHighlight}>Sign in</Text>
            </TouchableOpacity>
          </Link>
        </View>

        <Text style={styles.terms}>
          By signing up you agree to our Terms of Service and Privacy Policy.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
      {(loading || authenticating) && (
        <View style={StyleSheet.absoluteFill}>
          <LoadingScreen message="Signing you in…" />
        </View>
      )}
    </View>
  );
}

const makeStyles = (c: ColorScheme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.background },
  scroll: { flexGrow: 1, paddingBottom: SPACING.xxl },

  hero: { alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 60 : 44, paddingBottom: SPACING.lg },
  logoCircle: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: c.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.md, ...SHADOW.primary,
  },
  logoLetter: { fontSize: 30, fontWeight: '900', color: '#fff' },
  appName: { fontSize: 26, fontWeight: '800', color: c.text, letterSpacing: -0.5 },
  tagline: { fontSize: FONT_SIZE.sm, color: c.textSecondary, marginTop: 4 },

  card: {
    marginHorizontal: SPACING.md,
    backgroundColor: c.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOW.md,
  },
  cardTitle: { fontSize: FONT_SIZE.xxl, fontWeight: '800', color: c.text, letterSpacing: -0.5 },
  cardSub: { fontSize: FONT_SIZE.sm, color: c.textSecondary, marginTop: 4, marginBottom: SPACING.lg },

  field: { marginBottom: SPACING.md },
  fieldLabel: { fontSize: FONT_SIZE.xs, fontWeight: '700', color: c.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.background, borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5, borderColor: c.border, paddingHorizontal: SPACING.md,
  },
  inputRowFocused: { borderColor: c.primary, backgroundColor: c.primaryLight },
  inputIcon: { marginRight: SPACING.sm },
  input: { flex: 1, paddingVertical: 14, fontSize: FONT_SIZE.md, color: c.text },
  eyeBtn: { padding: 4 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FEF2F2', borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm, marginBottom: SPACING.md,
  },
  errorText: { flex: 1, fontSize: FONT_SIZE.sm, color: c.danger },

  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    backgroundColor: c.primary, borderRadius: BORDER_RADIUS.md,
    paddingVertical: 16, marginBottom: SPACING.lg, ...SHADOW.primary,
  },
  btnLoading: { opacity: 0.75 },
  btnText: { color: '#fff', fontSize: FONT_SIZE.md, fontWeight: '700', letterSpacing: 0.2 },

  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: c.border },
  dividerText: { marginHorizontal: SPACING.md, fontSize: FONT_SIZE.xs, color: c.textTertiary, fontWeight: '600' },
  linkRow: { flexDirection: 'row', justifyContent: 'center' },
  linkText: { fontSize: FONT_SIZE.sm, color: c.textSecondary },
  linkHighlight: { fontSize: FONT_SIZE.sm, color: c.primary, fontWeight: '700' },

  terms: { textAlign: 'center', fontSize: FONT_SIZE.xs, color: c.textTertiary, marginTop: SPACING.lg, paddingHorizontal: SPACING.xl },
});
