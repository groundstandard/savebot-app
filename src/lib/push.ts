import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { supabase } from './supabase';
import { ensureNotificationPermission } from './notifications';

// Whether this device successfully registered for remote push this session.
// When true, the realtime hook skips its local notification so foreground
// saves don't show a duplicate banner (server push covers all app states).
let pushActive = false;
export function isPushActive(): boolean {
  return pushActive;
}

const projectId =
  (Constants?.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
  (Constants as { easConfig?: { projectId?: string } })?.easConfig?.projectId ??
  'c73236bf-63ff-4b20-9a20-839f9dce7f5f';

/** The Expo push token string for this device, or null if unavailable. */
async function getToken(): Promise<string | null> {
  try {
    const res = await Notifications.getExpoPushTokenAsync({ projectId });
    return res?.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Register this device for remote push: set the Android channel, ensure
 * permission, fetch the Expo push token, and upsert it for the user.
 * Best-effort — returns false on web, simulators, denied permission, or a
 * build without push credentials. The app then keeps its foreground-only
 * local notification as a fallback.
 */
export async function registerPushToken(userId: string): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#6366F1',
      });
    }
    if (!(await ensureNotificationPermission())) return false;

    const token = await getToken();
    if (!token) return false;

    await supabase.from('push_tokens').upsert(
      { user_id: userId, token, platform: Platform.OS, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,token' },
    );
    pushActive = true;
    return true;
  } catch {
    return false;
  }
}

/** Drop this device's token on sign-out so it stops receiving pushes. Best-effort. */
export async function unregisterPushToken(userId: string): Promise<void> {
  pushActive = false;
  if (Platform.OS === 'web') return;
  const token = await getToken();
  if (!token) return;
  try {
    await supabase.from('push_tokens').delete().eq('user_id', userId).eq('token', token);
  } catch {
    /* ignore */
  }
}
