import React, { useEffect } from 'react';
import { UIManager, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler'; // <-- Nowy import
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import * as Updates from 'expo-updates';

// Włączenie LayoutAnimation dla Androida tylko w starym architekturze (bez Fabric)
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental &&
  !(globalThis as any).nativeFabricUIManager
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function App() {
  // Ciche sprawdzenie aktualizacji OTA na starcie
  useEffect(() => {
    (async () => {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch {
        // Ignoruj błędy aktualizacji w tle
      }
    })();
  }, []);
  return (
    // ZMIANA: Dodajemy SafeAreaProvider na szczycie drzewa i GestureHandlerRootView jako kontener
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AppNavigator />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
