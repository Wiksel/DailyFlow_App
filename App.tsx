import React, { useEffect } from 'react';
import { UIManager, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler'; // <-- Nowy import
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import * as Updates from 'expo-updates';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { UIProvider } from './src/contexts/UIContext';
import ErrorBoundary from './src/components/ErrorBoundary';
import Logger, { setLogLevel, setExceptionHandler } from './src/utils/logger';
import { useFonts } from 'expo-font';
import { Outfit_400Regular, Outfit_900Black } from '@expo-google-fonts/outfit';
import { DancingScript_400Regular, DancingScript_700Bold } from '@expo-google-fonts/dancing-script';

// Włączenie LayoutAnimation dla Androida tylko w starym architekturze (bez Fabric)
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental &&
  !(globalThis as any).nativeFabricUIManager
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_900Black,
    DancingScript_400Regular,
    DancingScript_700Bold,
    PlayfairDisplay_400Regular: require('./assets/fonts/PlayfairDisplay_400Regular.ttf'),
    PlayfairDisplay_700Bold: require('./assets/fonts/PlayfairDisplay_700Bold.ttf'),
  });

  // Ciche sprawdzenie aktualizacji OTA na starcie
  useEffect(() => {
    // Konfiguracja log levelu
    try { setLogLevel(__DEV__ ? 'debug' : 'warn'); } catch { }
    // Opcjonalna integracja z telemetrią (Sentry/Bugsnag/Crashlytics)
    try {
      // Lazy import, brak twardej zależności
      (async () => {
        // Przykładowa integracja z Sentry (jeśli kiedyś dodasz paczkę):
        // const Sentry = await import('@sentry/react-native');
        // Sentry.init({ dsn: '...', tracesSampleRate: 0.1 });
        setExceptionHandler((error, context) => {
          // Sentry?.captureException?.(error, { extra: context });
        });
      })();
    } catch { }
    (async () => {
      // Don't check for updates in development
      if (__DEV__) return;

      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch {
        // Ignoruj błędy aktualizacji w tle, zaloguj dla diagnostyki
        Logger.debug('OTA update check failed');
      }
    })();
  }, []);
  if (!fontsLoaded) {
    return null;
  }

  return (
    // ZMIANA: Dodajemy ThemeProvider, SafeAreaProvider i GestureHandlerRootView
    <ThemeProvider>
      <UIProvider>
        <SafeAreaProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <ErrorBoundary>
              <AppNavigator />
            </ErrorBoundary>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </UIProvider>
    </ThemeProvider>
  );
}
