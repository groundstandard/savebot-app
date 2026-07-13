import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// expo-secure-store has no web implementation — lazy-require it on native only
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ss = () => require('expo-secure-store') as typeof import('expo-secure-store');

const storage = Platform.OS === 'web'
  ? {
      getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
      setItem: (key: string, value: string) => { localStorage.setItem(key, value); return Promise.resolve(); },
      removeItem: (key: string) => { localStorage.removeItem(key); return Promise.resolve(); },
    }
  : {
      getItem: (key: string) => ss().getItemAsync(key),
      setItem: (key: string, value: string) => ss().setItemAsync(key, value),
      removeItem: (key: string) => ss().deleteItemAsync(key),
    };

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    // On web the OAuth redirect returns tokens in the URL — parse them so the
    // session is picked up. On native we handle the redirect manually (socialAuth).
    detectSessionInUrl: Platform.OS === 'web',
  },
});
