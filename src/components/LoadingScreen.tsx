import { useMemo } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useColors } from '../hooks/useColors';
import { SPACING, FONT_SIZE, SHADOW, type ColorScheme } from '../constants';

/** Full-screen branded loading state — used on cold start and during sign-in
 *  so the transition into the app is smooth (no login-screen flash). */
export function LoadingScreen({ message = 'Loading…' }: { message?: string }) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={styles.root}>
      <View style={styles.logo}>
        <Text style={styles.logoText}>S</Text>
      </View>
      <ActivityIndicator color={c.primary} style={styles.spinner} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const makeStyles = (c: ColorScheme) => StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.background },
  logo: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: c.primary,
    alignItems: 'center', justifyContent: 'center',
    ...SHADOW.primary,
  },
  logoText: { fontSize: 36, fontWeight: '900', color: '#fff' },
  spinner: { marginTop: SPACING.xl },
  message: { marginTop: SPACING.md, fontSize: FONT_SIZE.sm, color: c.textSecondary, fontWeight: '500' },
});
