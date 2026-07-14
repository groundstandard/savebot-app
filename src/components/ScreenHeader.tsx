import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../hooks/useColors';
import { SPACING, FONT_SIZE, type ColorScheme } from '../constants';

export function ScreenHeader({ title }: { title: string }) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.btn} hitSlop={12} activeOpacity={0.6}>
        <Ionicons name="chevron-back" size={24} color={c.text} />
      </TouchableOpacity>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <View style={styles.btn} />
    </View>
  );
}

const makeStyles = (c: ColorScheme) => StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm,
    backgroundColor: c.background,
  },
  btn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: FONT_SIZE.lg, fontWeight: '800', color: c.text, letterSpacing: -0.3 },
});
