import { Component, type ReactNode } from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { error: Error | null }

/**
 * Catches render/runtime errors anywhere below it and shows the message on
 * screen instead of a blank white screen — so failures are diagnosable in
 * release builds.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary]', error);
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback !== undefined) return this.props.fallback;
      return (
        <View style={styles.root}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.msg}>{this.state.error.message}</Text>
            {!!this.state.error.stack && (
              <Text style={styles.stack}>{this.state.error.stack}</Text>
            )}
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1E1B4B' },
  content: { padding: 24, paddingTop: Platform.OS === 'ios' ? 80 : 56 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 12 },
  msg: { color: '#FCA5A5', fontSize: 15, fontWeight: '600', marginBottom: 16, lineHeight: 22 },
  stack: { color: '#C7D2FE', fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', lineHeight: 16 },
});
