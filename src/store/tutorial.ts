import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'savebot:tutorial-seen';

interface TutorialState {
  seen: boolean;
  loaded: boolean;
  /** Load the persisted flag once at startup. */
  load: () => Promise<void>;
  /** Mark the first-run tutorial as dismissed (persisted). */
  dismiss: () => void;
}

export const useTutorialStore = create<TutorialState>((set) => ({
  seen: false,
  loaded: false,
  load: async () => {
    const v = await AsyncStorage.getItem(KEY);
    set({ seen: v === '1', loaded: true });
  },
  dismiss: () => {
    set({ seen: true });
    AsyncStorage.setItem(KEY, '1');
  },
}));
