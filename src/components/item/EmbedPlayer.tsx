import { useMemo } from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useColors } from '../../hooks/useColors';
import { SPACING, FONT_SIZE, BORDER_RADIUS, type ColorScheme } from '../../constants';

export interface EmbedPlayerProps {
  html?: string | null;
  sourceUrl?: string | null;
  platform?: string | null;
}

/**
 * Web / default: no inline WebView player (react-native-webview has no clean web
 * support), so offer a "Watch on <platform>" button that opens the source.
 * The native variant (EmbedPlayer.native.tsx) renders the real inline embed.
 */
export function EmbedPlayer({ sourceUrl, platform }: EmbedPlayerProps) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  if (!sourceUrl) return null;
  const label = platform ? `Watch on ${platform[0].toUpperCase()}${platform.slice(1)}` : 'Watch original';
  return (
    <TouchableOpacity style={styles.watch} onPress={() => WebBrowser.openBrowserAsync(sourceUrl)} activeOpacity={0.85}>
      <Ionicons name="play-circle" size={20} color="#fff" />
      <Text style={styles.watchText}>{label}</Text>
    </TouchableOpacity>
  );
}

const makeStyles = (c: ColorScheme) => StyleSheet.create({
  watch: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: c.primary, borderRadius: BORDER_RADIUS.md,
    paddingVertical: 12, marginBottom: SPACING.md,
  },
  watchText: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZE.md },
});
