import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as Network from 'expo-network';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Density = 'standard' | 'compact';

interface UISettings {
  density: Density;
  setDensity: (d: Density) => void;
  isOffline: boolean;
  pendingOpsCount: number;
  focusModeEnabled: boolean;
  setFocusModeEnabled: (v: boolean) => void;
}

const STORAGE_KEY = 'dailyflow_ui_density';
const FOCUS_KEY = 'dailyflow_ui_focus_mode';

const UIContext = createContext<UISettings | undefined>(undefined);

export const UIProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [density, setDensityState] = useState<Density>('standard');
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [pendingOpsCount, setPendingOpsCount] = useState<number>(0);
  const [focusModeEnabled, setFocusModeEnabledState] = useState<boolean>(false);

  const prevOfflineRef = useRef<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        const d = await AsyncStorage.getItem(STORAGE_KEY);
        if (d === 'compact' || d === 'standard') setDensityState(d as Density);
      } catch {}
      try {
        const stored = await AsyncStorage.getItem(FOCUS_KEY);
        if (stored === '1' || stored === 'true') setFocusModeEnabledState(true);
        else if (stored === '0' || stored === 'false') setFocusModeEnabledState(false);
      } catch {}
      try {
        const state = await Network.getNetworkStateAsync();
        const online = !!(state.isConnected && state.isInternetReachable);
        setIsOffline(!online);
        prevOfflineRef.current = !online;
      } catch {}
    })();

    const t = setInterval(async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        const online = !!(state.isConnected && state.isInternetReachable);
        setIsOffline(!online);
        if (online && prevOfflineRef.current) {
          prevOfflineRef.current = false;
          const mod = await import('../utils/offlineQueue');
          try { await mod.processOutbox(); } catch {}
        } else if (!online) {
          prevOfflineRef.current = true;
        }
      } catch {}
    }, 5000);
    return () => clearInterval(t);
  }, []);

  const setDensity = async (d: Density) => {
    setDensityState(d);
    try { await AsyncStorage.setItem(STORAGE_KEY, d); } catch {}
  };

  const setFocusModeEnabled = async (v: boolean) => {
    setFocusModeEnabledState(v);
    try { await AsyncStorage.setItem(FOCUS_KEY, v ? '1' : '0'); } catch {}
  };

  useEffect(() => {
    const readCount = async () => {
      try {
        const { getAuth } = await import('@react-native-firebase/auth');
        const uid = getAuth().currentUser?.uid; if (!uid) { setPendingOpsCount(0); return; }
        const key = `dailyflow_outbox_${uid}`;
        const raw = await AsyncStorage.getItem(key);
        const arr = raw ? JSON.parse(raw) : [];
        setPendingOpsCount(Array.isArray(arr) ? arr.length : 0);
      } catch { setPendingOpsCount(0); }
    };
    const t = setInterval(readCount, 4000);
    readCount();
    return () => clearInterval(t);
  }, []);

  const value = useMemo(() => ({ density, setDensity, isOffline, pendingOpsCount, focusModeEnabled, setFocusModeEnabled }), [density, isOffline, pendingOpsCount, focusModeEnabled]);
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUI = () => {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within UIProvider');
  return ctx;
};


