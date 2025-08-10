import 'react-native-get-random-values';

// Silence RNFirebase v22 modular deprecation warnings while we migrate
// Must be set before any Firebase modules initialize
// See: https://rnfirebase.io/migrating-to-v22
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;
import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
