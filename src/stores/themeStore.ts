import { create } from 'zustand';
import { Platform } from 'react-native';
import { PaletteId } from '../constants';

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeState {
  preference: ThemePreference;
  palette: PaletteId;
  setPreference: (preference: ThemePreference) => void;
  setPalette: (palette: PaletteId) => void;
}

// Simple localStorage persistence for web, no-op on native
function loadSaved(): Partial<Pick<ThemeState, 'preference' | 'palette'>> {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const raw = window.localStorage.getItem('skitur-theme');
      if (raw) return JSON.parse(raw);
    }
  } catch {}
  return {};
}

function save(state: Pick<ThemeState, 'preference' | 'palette'>) {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.localStorage.setItem('skitur-theme', JSON.stringify(state));
    }
  } catch {}
}

const saved = loadSaved();

export const useThemeStore = create<ThemeState>((set, get) => ({
  preference: saved.preference ?? 'system',
  palette: saved.palette ?? 'nordic',
  setPreference: (preference) => {
    set({ preference });
    save({ preference, palette: get().palette });
  },
  setPalette: (palette) => {
    set({ palette });
    save({ preference: get().preference, palette });
  },
}));
