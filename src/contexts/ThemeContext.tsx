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

export const lightColors: ThemeColors = {
  primary: '#0782F9',        // Standard Blue
  purple: '#7e57c2',
  secondary: '#17a2b8',      // Teal/Cyan for info
  success: '#28a745',
  danger: '#e74c3c',
  warning: '#f1c40f',
  info: '#17a2b8',
  textPrimary: '#1a1a1a',    // Darker for better contrast
  textSecondary: '#5a5a5a',  // Darker gray
  background: '#F5F1E6',     // Darker warmer beige
  card: '#ffffff',
  border: '#e0e0e0',         // More visible border
  inputBackground: '#F0F2F5', // Distinct from white card/background
  shadow: '#000000',
  placeholder: '#6c757d',    // Darker placeholder for visibility
};

export const darkColors: ThemeColors = {
  primary: '#4DA3FF',        // Brighter Blue for Dark Mode
  purple: '#B39DDB',         // Light Purple
  secondary: '#4DD0E1',      // Cyan Accent
  success: '#00E676',        // Bright Green
  danger: '#FF5252',         // Bright Red
  warning: '#FFD740',        // Bright Yellow
  info: '#40C4FF',           // Bright Info Blue
  textPrimary: '#F5F5F5',    // Near White
  textSecondary: '#B0BEC5',  // Light Blue-Gray
  background: '#121212',     // Deep Black
  card: '#1E1E1E',           // Dark Gray Card
  border: '#333333',         // Subtle Border
  inputBackground: '#2C2C2C',// Distinct Input Background
  shadow: '#000000',
  placeholder: '#78909C',    // Blue-Gray Placeholder
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
      } catch { }
    })();
    const listener = ({ colorScheme }: { colorScheme: ColorSchemeName }) => { if (colorScheme) setSystemScheme(colorScheme); };
    try {
      // RN 0.79 API
      const sub = Appearance.addChangeListener(listener);
      return () => sub.remove();
    } catch {
      // Fallback
      const sub2: any = Appearance.addChangeListener(listener as any);
      return () => { try { sub2.remove(); } catch { } };
    }
  }, []);

  const setMode = async (next: ThemeMode) => {
    setModeState(next);
    try { await AsyncStorage.setItem(THEME_STORAGE_KEY, next); } catch { }
  };

  const setAccent = async (a: Accent) => {
    setAccentState(a);
    try { await AsyncStorage.setItem(ACCENT_STORAGE_KEY, a); } catch { }
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



