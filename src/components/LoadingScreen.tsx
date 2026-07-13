import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, SHADOW } from '../constants';

/** Full-screen branded loading state — used on cold start and during sign-in
 *  so the transition into the app is smooth (no login-screen flash). */
export function LoadingScreen({ message = 'Loading…' }: { message?: string }) {
  return (
    <View style={styles.root}>
      <View style={styles.logo}>
        <Text style={styles.logoText}>S</Text>
      </View>
      <ActivityIndicator color={COLORS.primary} style={styles.spinner} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  logo: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    ...SHADOW.primary,
  },
  logoText: { fontSize: 36, fontWeight: '900', color: '#fff' },
  spinner: { marginTop: SPACING.xl },
  message: { marginTop: SPACING.md, fontSize: FONT_SIZE.sm, color: COLORS.textSecondary, fontWeight: '500' },
});
