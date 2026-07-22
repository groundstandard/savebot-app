import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
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
 * Native: render the platform's own oembed embed (iframe/blockquote) inline in a
 * WebView — plays the original video without downloading it. Falls back to a
 * "Watch on <platform>" button when there's no embed HTML.
 */
export function EmbedPlayer({ html, sourceUrl, platform }: EmbedPlayerProps) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [loading, setLoading] = useState(true);

  if (html) {
    const doc = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0;background:transparent;overflow:hidden}iframe,blockquote,video{max-width:100%!important}</style></head><body>${html}</body></html>`;
    return (
      <View style={styles.embedWrap}>
        {loading && <ActivityIndicator color={c.primary} style={styles.loader} />}
        <WebView
          source={{ html: doc }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          onLoadEnd={() => setLoading(false)}
        />
      </View>
    );
  }

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
  embedWrap: {
    height: 320, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden',
    marginBottom: SPACING.md, backgroundColor: c.surfaceAlt,
  },
  webview: { flex: 1, backgroundColor: 'transparent' },
  loader: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 },
  watch: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: c.primary, borderRadius: BORDER_RADIUS.md,
    paddingVertical: 12, marginBottom: SPACING.md,
  },
  watchText: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZE.md },
});
