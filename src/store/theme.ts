import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'system' | 'light' | 'dark';
const KEY = 'savebot:theme';

interface ThemeState {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  load: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'system',
  setMode: (mode) => {
    set({ mode });
    AsyncStorage.setItem(KEY, mode);
  },
  load: async () => {
    const v = await AsyncStorage.getItem(KEY);
    if (v === 'light' || v === 'dark' || v === 'system') set({ mode: v });
  },
}));
