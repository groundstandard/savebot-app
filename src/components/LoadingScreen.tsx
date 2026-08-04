import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/**
 * Full-screen branded, animated splash / loading screen — shown on cold start
 * and during sign-in. The bookmark mark fades + springs in, then gently
 * breathes; "SaveBot" and the status message follow. Brand indigo + white so it
 * matches the app icon and the native launch splash (seamless hand-off — no
 * grid flash).
 */

const BRAND = '#6366F1';
// Same bookmark path as the app icon (1024 viewBox).
const BOOKMARK = 'M312 332 Q312 252 392 252 L632 252 Q712 252 712 332 L712 772 L512 622 L312 772 Z';

export function LoadingScreen({ message = 'Loading…' }: { message?: string }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const entrance = Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
      Animated.timing(textOpacity, { toValue: 1, duration: 500, delay: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]);
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.06, duration: 850, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.0, duration: 850, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    entrance.start(() => pulse.start());
    return () => {
      entrance.stop();
      pulse.stop();
    };
  }, [opacity, scale, textOpacity]);

  return (
    <View style={styles.root}>
      <Animated.View style={{ opacity, transform: [{ scale }] }}>
        <Svg width={96} height={96} viewBox="0 0 1024 1024">
          <Path d={BOOKMARK} fill="#ffffff" />
        </Svg>
      </Animated.View>
      <Animated.Text style={[styles.wordmark, { opacity: textOpacity }]}>SaveBot</Animated.Text>
      <Animated.Text style={[styles.message, { opacity: textOpacity }]}>{message}</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BRAND },
  wordmark: { marginTop: 22, fontSize: 26, fontWeight: '800', color: '#ffffff', letterSpacing: 0.5 },
  message: { marginTop: 10, fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
});
