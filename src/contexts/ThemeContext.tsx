import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface ThemeColors {
  primary: string;
  purple: string;
  secondary: string;
  success: string;
  danger: string;
  warning: string;
  info: string;
  textPrimary: string;
  textSecondary: string;
  background: string;
  card: string;
  border: string;
  inputBackground: string;
  shadow: string;
  placeholder: string;
}

export type Accent = 'blue' | 'purple' | 'mint' | 'orange';

export interface Theme {
  mode: ThemeMode;
  colorScheme: Exclude<ColorSchemeName, null>;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
  accent: Accent;
  setAccent: (a: Accent) => void;
}

const THEME_STORAGE_KEY = 'dailyflow_theme_mode';
const ACCENT_STORAGE_KEY = 'dailyflow_theme_accent';

const lightColors: ThemeColors = {
  primary: '#0782F9',
  purple: '#7e57c2',
  secondary: '#5bc0de',
  success: '#28a745',
  danger: '#e74c3c',
  warning: '#f1c40f',
  info: '#17a2b8',
  textPrimary: '#333333',
  textSecondary: '#6c757d',
  background: '#f5f5f5',
  card: '#ffffff',
  border: '#2b2b2b1a', // #eee with alpha
  inputBackground: '#f1f3f5',
  shadow: '#000000',
  placeholder: '#adb5bd',
};

const darkColors: ThemeColors = {
  primary: '#5aa9ff',
  purple: '#a996e6',
  secondary: '#6ad0ea',
  success: '#38d16a',
  danger: '#ff6b5a',
  warning: '#ffd166',
  info: '#42c9dd',
  textPrimary: '#eaeaea',
  textSecondary: '#b0b3b8',
  background: '#121212',
  card: '#1e1e1e',
  border: '#2a2a2a',
  inputBackground: '#2a2a2a',
  shadow: '#000000',
  placeholder: '#8a8f98',
};

const ThemeContext = createContext<Theme | undefined>(undefined);
// Optional export for class components (e.g., ErrorBoundary) to access theme
export const ThemeReactContext = ThemeContext;

export const ThemeProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [systemScheme, setSystemScheme] = useState<Exclude<ColorSchemeName, null>>((Appearance as any).getColorScheme?.() || 'light');
  const [accent, setAccentState] = useState<Accent>('blue');

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setModeState(stored);
        }
        const storedAccent = await AsyncStorage.getItem(ACCENT_STORAGE_KEY);
        if (storedAccent === 'blue' || storedAccent === 'purple' || storedAccent === 'mint' || storedAccent === 'orange') {
          setAccentState(storedAccent);
        }
      } catch {}
    })();
    const listener = ({ colorScheme }: { colorScheme: ColorSchemeName }) => { if (colorScheme) setSystemScheme(colorScheme); };
    try {
      // RN 0.79 API
      const sub = Appearance.addChangeListener(listener);
      return () => sub.remove();
    } catch {
      // Fallback
      const sub2: any = Appearance.addChangeListener(listener as any);
      return () => { try { sub2.remove(); } catch {} };
    }
  }, []);

  const setMode = async (next: ThemeMode) => {
    setModeState(next);
    try { await AsyncStorage.setItem(THEME_STORAGE_KEY, next); } catch {}
  };

  const setAccent = async (a: Accent) => {
    setAccentState(a);
    try { await AsyncStorage.setItem(ACCENT_STORAGE_KEY, a); } catch {}
  };

  const effectiveScheme: Exclude<ColorSchemeName, null> = useMemo(() => {
    if (mode === 'system') return systemScheme;
    return mode === 'dark' ? 'dark' : 'light';
  }, [mode, systemScheme]);

  const base = effectiveScheme === 'dark' ? darkColors : lightColors;
  const primaryByAccent: Record<Accent, string> = {
    blue: base.primary,
    purple: base.purple,
    mint: effectiveScheme === 'dark' ? '#5bd8b2' : '#2ec4b6',
    orange: effectiveScheme === 'dark' ? '#ff9f43' : '#ff7f11',
  };
  const colors: ThemeColors = { ...base, primary: primaryByAccent[accent] };

  const value: Theme = useMemo(() => ({ mode, colorScheme: effectiveScheme, colors, setMode, accent, setAccent }), [mode, effectiveScheme, colors, accent]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};


