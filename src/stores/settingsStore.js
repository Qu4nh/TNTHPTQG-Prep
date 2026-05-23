/**
 * Settings store - persists API keys and app configuration.
 */

import { create } from 'zustand';
import { loadFromStorage, saveToStorage } from '../utils/storage';

const SETTINGS_KEY = 'settings';

const defaultSettings = {
  geminiApiKey: '',
  theme: 'light',
};

const useSettingsStore = create((set, get) => ({
  ...defaultSettings,
  ...loadFromStorage(SETTINGS_KEY, defaultSettings),

  setGeminiApiKey: (key) => {
    set({ geminiApiKey: key });
    saveToStorage(SETTINGS_KEY, { ...get() });
  },

  setTheme: (theme) => {
    set({ theme });
    saveToStorage(SETTINGS_KEY, { ...get() });
  },

  clearSettings: () => {
    set(defaultSettings);
    saveToStorage(SETTINGS_KEY, defaultSettings);
  },
}));

export default useSettingsStore;
