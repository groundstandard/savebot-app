import { useEffect, useRef } from 'react';
import { Animated, type DimensionValue, type ViewStyle } from 'react-native';
import { useColors } from '../hooks/useColors';

/**
 * A pulsing placeholder box for loading states. Uses the native driver so the
 * pulse is smooth and cheap.
 */
export function Skeleton({
  height,
  width = '100%',
  radius = 10,
  style,
}: {
  height: number;
  width?: DimensionValue;
  radius?: number;
  style?: ViewStyle;
}) {
  const c = useColors();
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: c.surfaceAlt, opacity }, style]}
    />
  );
}
