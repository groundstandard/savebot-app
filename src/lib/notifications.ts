import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

const PREFS_KEY = 'savebot:notif_prefs';

// Foreground notifications show as a banner.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let permissionAsked = false;

/** Ask once for notification permission (no-op on web). */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (permissionAsked && !current.canAskAgain) return false;
  permissionAsked = true;
  // iOS needs the alert/badge/sound flags spelled out; Android ignores them.
  const req = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return req.granted;
}

async function saveDoneEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (!raw) return true; // default on
    return JSON.parse(raw).save_done !== false;
  } catch {
    return true;
  }
}

/** Fire a local "save complete" notification, respecting the user's pref. */
export async function notifySaveComplete(
  title: string,
  categoryName?: string | null,
  itemId?: string,
): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!(await saveDoneEnabled())) return;
  if (!(await ensureNotificationPermission())) return;

  const body = categoryName ? `${title} → ${categoryName}` : title;
  await Notifications.scheduleNotificationAsync({
    content: { title: '✓ Saved', body, data: itemId ? { itemId } : {} },
    trigger: null, // immediate
  });
}
