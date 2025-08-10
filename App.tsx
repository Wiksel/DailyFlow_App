import React, { useEffect } from 'react';
import { UIManager, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler'; // <-- Nowy import
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import * as Updates from 'expo-updates';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { UIProvider } from './src/contexts/UIContext';

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
    // ZMIANA: Dodajemy ThemeProvider, SafeAreaProvider i GestureHandlerRootView
    <ThemeProvider>
      <UIProvider>
        <SafeAreaProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <AppNavigator />
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </UIProvider>
    </ThemeProvider>
  );
}
