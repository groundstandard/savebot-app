import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
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

  // Any session change ends the "authenticating" phase so the UI stops showing
  // the loading screen and routes accordingly.
  setSession: (session) => set({ session, loading: false, authenticating: false }),

  setAuthenticating: (authenticating) => set({ authenticating }),

  setUser: (user) => set({ user }),

  signOut: async () => {
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
