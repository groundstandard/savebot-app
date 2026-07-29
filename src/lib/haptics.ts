import { Vibration, Platform } from 'react-native';

/**
 * Lightweight tactile feedback using core React Native `Vibration` — no native
 * module, so it needs no new EAS build. (expo-haptics would give nicer impact
 * styles but isn't installed.) No-ops on web.
 */
const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

/** A quick tap — favorites, toggles, selections. */
export function tapFeedback(): void {
  if (enabled) Vibration.vibrate(10);
}

/** A short confirmation — a save completed. */
export function successFeedback(): void {
  if (enabled) Vibration.vibrate(20);
}

/** A stronger double pulse — destructive actions like delete. */
export function warnFeedback(): void {
  if (enabled) Vibration.vibrate([0, 25, 60, 25]);
}
