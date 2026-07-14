import { useColorScheme } from 'react-native';
import { COLORS, DARK_COLORS, type ColorScheme } from '../constants';
import { useThemeStore } from '../store/theme';

/** Active color palette based on the user's Appearance choice (system/light/dark). */
export function useColors(): ColorScheme {
  const mode = useThemeStore((s) => s.mode);
  const system = useColorScheme();
  const dark = mode === 'dark' || (mode === 'system' && system === 'dark');
  return dark ? DARK_COLORS : COLORS;
}

/** True when the resolved theme is dark (for StatusBar, etc.). */
export function useIsDark(): boolean {
  const mode = useThemeStore((s) => s.mode);
  const system = useColorScheme();
  return mode === 'dark' || (mode === 'system' && system === 'dark');
}
