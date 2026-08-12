import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { unregisterPushToken } from '../lib/push';
import { resetUser } from '../lib/analytics';
import type { User } from '../types';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  authenticating: boolean; // true from tapping a social button until the session lands
  setSession: (session: Session | null) => void;
  setAuthenticating: (v: boolean) => void;
  setUser: (user: User | null) => void;
  signOut: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  loading: true,
  authenticating: false,

  // Keep "authenticating" true while a session is being established (so the login
  // form never flashes back before navigation); only clear it when we end up with
  // no session (sign-out / expiry), so the login screen can show again.
  setSession: (session) =>
    set({ session, loading: false, ...(session ? {} : { authenticating: false }) }),

  setAuthenticating: (authenticating) => set({ authenticating }),

  setUser: (user) => set({ user }),

  signOut: async () => {
    const uid = get().session?.user?.id;
    if (uid) await unregisterPushToken(uid);
    resetUser();
    await supabase.auth.signOut();
    set({ session: null, user: null, authenticating: false });
  },

  fetchUser: async () => {
    const { session } = get();
    if (!session) return;
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();
    if (data) set({ user: data as User });
  },
}));
