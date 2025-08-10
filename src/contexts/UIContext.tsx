import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Density = 'standard' | 'compact';

interface UISettings {
  density: Density;
  setDensity: (d: Density) => void;
}

const STORAGE_KEY = 'dailyflow_ui_density';

const UIContext = createContext<UISettings | undefined>(undefined);

export const UIProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [density, setDensityState] = useState<Density>('standard');

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === 'standard' || stored === 'compact') setDensityState(stored);
      } catch {}
    })();
  }, []);

  const setDensity = async (d: Density) => {
    setDensityState(d);
    try { await AsyncStorage.setItem(STORAGE_KEY, d); } catch {}
  };

  const value = useMemo(() => ({ density, setDensity }), [density]);
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUI = () => {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within UIProvider');
  return ctx;
};


