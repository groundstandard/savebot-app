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

export default function LoginScreen() {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [emailFocus, setEmailFocus] = useState(false);
  const [passFocus, setPassFocus] = useState(false);
  const authenticating = useAuthStore((s) => s.authenticating);

  async function handleLogin() {
    setErrorMsg('');
    if (!email || !password) { setErrorMsg('Please enter your email and password.'); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setLoading(false); setErrorMsg(error.message); return; }
    // Set the session synchronously before navigating so the index doesn't
    // briefly see "no session" and flash the login screen again.
    if (data.session) useAuthStore.getState().setSession(data.session);
    router.replace('/');
  }

  return (
    <View style={{ flex: 1 }}>
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoLetter}>S</Text>
          </View>
          <Text style={styles.appName}>SaveBot</Text>
          <Text style={styles.tagline}>Your saves, actually organized.</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardSub}>Sign in to your account</Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Email</Text>
            <View style={[styles.inputRow, emailFocus && styles.inputRowFocused]}>
              <Ionicons name="mail-outline" size={18} color={emailFocus ? c.primary : c.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={c.textTertiary}
                value={email}
                onChangeText={(t) => { setEmail(t); setErrorMsg(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
                onFocus={() => setEmailFocus(true)}
                onBlur={() => setEmailFocus(false)}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Password</Text>
            <View style={[styles.inputRow, passFocus && styles.inputRowFocused]}>
              <Ionicons name="lock-closed-outline" size={18} color={passFocus ? c.primary : c.textTertiary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Your password"
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
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <Text style={styles.btnText}>Signing in…</Text>
              : <>
                  <Text style={styles.btnText}>Sign in</Text>
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

          <Link href="/(auth)/signup" asChild>
            <TouchableOpacity style={styles.linkRow}>
              <Text style={styles.linkText}>Don't have an account? </Text>
              <Text style={styles.linkHighlight}>Sign up</Text>
            </TouchableOpacity>
          </Link>
        </View>

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

  hero: { alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 80 : 60, paddingBottom: SPACING.xl },
  logoCircle: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: c.primary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.md,
    ...SHADOW.primary,
  },
  logoLetter: { fontSize: 36, fontWeight: '900', color: '#fff' },
  appName: { fontSize: 28, fontWeight: '800', color: c.text, letterSpacing: -0.5 },
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
    paddingVertical: 16, marginBottom: SPACING.md,
    ...SHADOW.primary,
  },
  btnLoading: { opacity: 0.75 },
  btnText: { color: '#fff', fontSize: FONT_SIZE.md, fontWeight: '700', letterSpacing: 0.2 },

  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: c.border },
  dividerText: { marginHorizontal: SPACING.md, fontSize: FONT_SIZE.xs, color: c.textTertiary, fontWeight: '600' },


  linkRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  linkText: { fontSize: FONT_SIZE.sm, color: c.textSecondary },
  linkHighlight: { fontSize: FONT_SIZE.sm, color: c.primary, fontWeight: '700' },
});
