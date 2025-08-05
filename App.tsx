import React from 'react';
import { UIManager, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler'; // <-- Nowy import
import AppNavigator from './src/navigation/AppNavigator';

// Włączenie LayoutAnimation dla Androida
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

export default function App() {
  return (
    // ZMIANA: Dodajemy GestureHandlerRootView jako główny kontener aplikacji
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppNavigator />
    </GestureHandlerRootView>
  );
}
