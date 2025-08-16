import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as Network from 'expo-network';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Density = 'standard' | 'compact';

interface UISettings {
  density: Density;
  setDensity: (d: Density) => void;
  isOffline: boolean;
  pendingOpsCount: number;
}

const STORAGE_KEY = 'dailyflow_ui_density';

const UIContext = createContext<UISettings | undefined>(undefined);

export const UIProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [density, setDensityState] = useState<Density>('standard');
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [pendingOpsCount, setPendingOpsCount] = useState<number>(0);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === 'standard' || stored === 'compact') setDensityState(stored);
      } catch {}
    })();
    // initial network status
    const prevOfflineRef = { current: isOffline } as { current: boolean };
    (async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        const online = !!(state.isConnected && state.isInternetReachable);
        setIsOffline(!online);
        prevOfflineRef.current = !online;
      } catch {}
    })();
    // poll network status lightly; better would be event if available
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

  useEffect(() => {
    // read outbox size for current user periodically
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

  const value = useMemo(() => ({ density, setDensity, isOffline, pendingOpsCount }), [density, isOffline, pendingOpsCount]);
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUI = () => {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within UIProvider');
  return ctx;
};


